use anyhow::{Context, Result};
use leptess::LepTess;
use std::path::Path;
use std::sync::Arc;
use tokio::process::Command;

use crate::model::Chunk;

pub async fn chunk_document(
    path: &Path,
    file_type: &str,
    chunk_size: usize,
    overlap: usize,
) -> Result<Vec<Chunk>> {
    if overlap >= chunk_size {
        return Err(anyhow::anyhow!(
            "chunk overlap must be smaller than chunk size"
        ));
    }

    let text = extract_text(path, file_type).await?;
    Ok(split_text(&text, chunk_size, overlap))
}

async fn extract_text(path: &Path, file_type: &str) -> Result<String> {
    let is_pdf = path.extension().and_then(|value| value.to_str()) == Some("pdf")
        || file_type.to_ascii_lowercase().contains("pdf");

    if is_pdf {
        let output = Command::new("pdftotext")
            .args(["-layout"])
            .arg(path)
            .arg("-")
            .output()
            .await
            .context("failed to start pdftotext; ensure poppler-utils is installed")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!(
                "document text extraction failed: {}",
                String::from_utf8_lossy(&output.stderr).trim()
            ));
        }

        let text = String::from_utf8_lossy(&output.stdout).trim().to_owned();
        if !text.is_empty() {
            return Ok(text);
        }

        return ocr_pdf(path).await;
    }

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    if !matches!(
        extension,
        "txt" | "md" | "markdown" | "csv" | "json" | "yaml" | "yml" | "log"
    ) {
        return Err(anyhow::anyhow!(
            "unsupported document type for Rust indexer: {file_type}"
        ));
    }

    let bytes = tokio::fs::read(path)
        .await
        .context("failed to read document")?;
    let text = String::from_utf8_lossy(&bytes).trim().to_owned();
    if text.is_empty() {
        return Err(anyhow::anyhow!("document contains no extractable text"));
    }
    Ok(text)
}

async fn ocr_pdf(path: &Path) -> Result<String> {
    let path = Arc::new(path.to_owned());
    tokio::task::spawn_blocking(move || ocr_pdf_sync(path.as_ref()))
        .await
        .context("OCR worker task failed")?
}

fn ocr_pdf_sync(path: &Path) -> Result<String> {
    let temp_dir = tempfile::tempdir().context("failed to create OCR temporary directory")?;
    let prefix = temp_dir.path().join("page");
    let output = std::process::Command::new("pdftoppm")
        .args(["-png", "-r", "200"])
        .arg(path)
        .arg(&prefix)
        .output()
        .context("failed to start pdftoppm; ensure poppler-utils is installed")?;
    if !output.status.success() {
        return Err(anyhow::anyhow!(
            "PDF page rendering failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    let mut pages = std::fs::read_dir(temp_dir.path())
        .context("failed to list rendered PDF pages")?
        .filter_map(|entry| entry.ok().map(|item| item.path()))
        .filter(|page| page.extension().and_then(|value| value.to_str()) == Some("png"))
        .collect::<Vec<_>>();
    pages.sort();

    let mut output_text = String::new();
    for (index, page) in pages.iter().enumerate() {
        let mut tesseract = LepTess::new(None, "chi_sim+eng")
            .context("failed to initialize Tesseract; ensure chi_sim language data is installed")?;
        tesseract
            .set_image(page)
            .map_err(|error| anyhow::anyhow!("failed to load OCR page image: {error}"))?;
        let text = tesseract
            .get_utf8_text()
            .map_err(|error| anyhow::anyhow!("failed to recognize OCR page: {error}"))?
            .trim()
            .to_owned();
        if !text.is_empty() {
            output_text.push_str(&format!("[page:{}] {}\n", index + 1, text));
        }
    }

    let output_text = output_text.trim().to_owned();
    if output_text.is_empty() {
        return Err(anyhow::anyhow!("OCR produced no text"));
    }
    Ok(output_text)
}

pub fn split_text(text: &str, chunk_size: usize, overlap: usize) -> Vec<Chunk> {
    let clean = text.trim();
    if clean.is_empty() {
        return Vec::new();
    }

    let chars: Vec<char> = clean.chars().collect();
    let mut chunks = Vec::new();
    let mut start = 0;
    let step = chunk_size - overlap;

    while start < chars.len() {
        let end = (start + chunk_size).min(chars.len());
        let content: String = chars[start..end].iter().collect();
        let content = content.trim().to_owned();
        if !content.is_empty() {
            chunks.push(Chunk {
                index: chunks.len() as i32,
                content,
                metadata: serde_json::json!({}),
            });
        }
        if end == chars.len() {
            break;
        }
        start += step;
    }

    chunks
}

#[cfg(test)]
mod tests {
    use super::split_text;

    #[test]
    fn splits_with_overlap_and_unicode_safe_boundaries() {
        let chunks = split_text("你好世界，这是一段用于测试的中文文本。", 8, 2);

        assert!(chunks.len() > 1);
        assert_eq!(chunks[0].index, 0);
        assert!(chunks.iter().all(|chunk| !chunk.content.is_empty()));
    }
}
