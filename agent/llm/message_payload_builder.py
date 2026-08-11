from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from llm.chat_message import ChatMessage

ExtractText = Callable[[str, str], str]
ReadImageBase64 = Callable[[str], str]
GetMimeType = Callable[[str], str]
IsImage = Callable[[str], bool]


def build_message_payload(
    message: ChatMessage,
    *,
    extract_text: ExtractText,
    read_image_base64: ReadImageBase64,
    get_mime_type: GetMimeType,
    is_image: IsImage,
    logger: logging.Logger,
) -> dict[str, Any]:
    """Build a single OpenAI message payload with optional multimodal attachments."""
    if not message.attachments:
        return {"role": message.role, "content": message.content}

    image_parts = []
    doc_texts = []

    for attachment in message.attachments:
        file_type = attachment.get("file_type", "")
        file_path = attachment.get("file_path", "")
        file_name = attachment.get("file_name", "unknown")

        if not file_path:
            continue

        if is_image(file_type):
            try:
                image_parts.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{get_mime_type(file_type)};base64,{read_image_base64(file_path)}"},
                    }
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("读取图片失败 %s: %s", file_name, exc)
                doc_texts.append(f"[图片读取失败: {file_name}]")
            continue

        try:
            text = extract_text(file_path, file_type)
            doc_texts.append(f"--- {file_name} ---\n{text}")
        except Exception as exc:  # noqa: BLE001
            logger.warning("提取文档文本失败 %s: %s", file_name, exc)
            doc_texts.append(f"[文档提取失败: {file_name}]")

    parts: list[dict[str, Any]] = []
    if doc_texts:
        combined_text = message.content + "\n\n" + "\n\n".join(doc_texts)
        parts.append({"type": "text", "text": combined_text})
    else:
        parts.append({"type": "text", "text": message.content})

    parts.extend(image_parts)

    if len(parts) == 1 and parts[0]["type"] == "text":
        return {"role": message.role, "content": parts[0]["text"]}

    return {"role": message.role, "content": parts}
