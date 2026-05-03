use once_cell::sync::Lazy;
use rand::{distributions::Alphanumeric, Rng};
use serde::Serialize;
use std::net::TcpListener;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;

static DAEMON_STATE: Lazy<Mutex<Option<DaemonState>>> = Lazy::new(|| Mutex::new(None));

struct DaemonState {
    child: Child,
    token: String,
    port: u16,
}

#[derive(Serialize)]
struct AgentBootstrapResult {
    base_url: String,
    token: String,
    port: u16,
}

fn random_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect()
}

fn random_free_port() -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| format!("bind random port failed: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("read local addr failed: {e}"))?
        .port();
    drop(listener);
    Ok(port)
}

fn resolve_agent_paths() -> Result<(PathBuf, PathBuf), String> {
    let frontend_dir = std::env::current_dir().map_err(|e| format!("current_dir failed: {e}"))?;
    let repo_root = frontend_dir
        .parent()
        .ok_or_else(|| "repo root resolve failed".to_string())?;
    let agent_dir = repo_root.join("agent");
    let python_exe = agent_dir.join(".venv").join("Scripts").join("python.exe");
    Ok((agent_dir, python_exe))
}

#[tauri::command]
fn start_agent_daemon() -> Result<AgentBootstrapResult, String> {
    let mut guard = DAEMON_STATE.lock().map_err(|_| "daemon state lock poisoned".to_string())?;

    if let Some(existing) = guard.as_ref() {
        return Ok(AgentBootstrapResult {
            base_url: format!("http://127.0.0.1:{}", existing.port),
            token: existing.token.clone(),
            port: existing.port,
        });
    }

    let (agent_dir, python_exe) = resolve_agent_paths()?;
    if !python_exe.exists() {
        return Err(format!("python executable not found: {}", python_exe.display()));
    }

    let port = random_free_port()?;
    let token = random_token();

    let mut command = Command::new(&python_exe);
    command
        .current_dir(&agent_dir)
        .arg("app.py")
        .arg("--mode")
        .arg("api")
        .env("AGENT_MODE", "api")
        .env("AGENT_API_HOST", "127.0.0.1")
        .env("AGENT_API_PORT", format!("{}", port))
        .env("AGENT_API_TOKEN", &token)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let child = command
        .spawn()
        .map_err(|e| format!("spawn python agent failed: {e}"))?;

    *guard = Some(DaemonState {
        child,
        token: token.clone(),
        port,
    });

    Ok(AgentBootstrapResult {
        base_url: format!("http://127.0.0.1:{}", port),
        token,
        port,
    })
}

#[tauri::command]
fn stop_agent_daemon() -> Result<(), String> {
    let mut guard = DAEMON_STATE.lock().map_err(|_| "daemon state lock poisoned".to_string())?;
    if let Some(state) = guard.as_mut() {
        let _ = state.child.kill();
        let _ = state.child.wait();
    }
    *guard = None;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_agent_daemon, stop_agent_daemon])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let _ = stop_agent_daemon();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
