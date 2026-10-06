//! Read-only discovery for the official CLI. Never return agent instructions.
use std::collections::BTreeMap;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;

use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliAgent {
    id: String,
    scope: String,
}

#[tauri::command]
pub async fn antigravity_cli_agents(cwd: String) -> Result<Vec<CliAgent>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let home = crate::dirs_home().ok_or("Home directory not found")?;
        discover_agents(Path::new(&home), &crate::fs::expand_home(&cwd))
    })
    .await
    .map_err(|error| error.to_string())?
}

fn valid_agent_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 128
        && name.as_bytes()[0].is_ascii_alphanumeric()
        && name
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"_.-".contains(&byte))
        && name != "default"
}

fn discover_agents(home: &Path, project: &Path) -> Result<Vec<CliAgent>, String> {
    if !project.is_dir() {
        return Err("Choose an existing project to discover Antigravity CLI agents".into());
    }
    let mut agents = BTreeMap::new();
    for (directory, scope) in [
        (home.join(".gemini/config/agents"), "user"),
        (project.join(".agents/agents"), "project"),
    ] {
        let entries = match std::fs::read_dir(&directory) {
            Ok(entries) => entries,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(error) => {
                return Err(format!(
                    "Cannot read Antigravity CLI {scope} agents: {error}"
                ))
            }
        };
        for entry in entries {
            let entry = entry.map_err(|error| error.to_string())?;
            let id = entry.file_name().to_string_lossy().into_owned();
            if !valid_agent_name(&id) || !entry.path().is_dir() {
                continue;
            }
            let path = entry.path().join("agent.md");
            let file = match std::fs::File::open(path) {
                Ok(file) => file,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
                Err(error) => {
                    return Err(format!("Cannot read Antigravity CLI agent {id}: {error}"))
                }
            };
            // The documented identifier is the directory name. Check the required
            // frontmatter name agrees so a malformed definition cannot select another agent.
            let mut lines = BufReader::new(file).take(16 * 1024).lines();
            if lines
                .next()
                .transpose()
                .map_err(|error| error.to_string())?
                .as_deref()
                .map(str::trim)
                != Some("---")
            {
                continue;
            }
            let mut matching_name = false;
            let mut closed = false;
            for line in lines {
                let line = line.map_err(|error| error.to_string())?;
                if line.trim() == "---" {
                    closed = true;
                    break;
                }
                if let Some(name) = line.strip_prefix("name:") {
                    let name = name.trim().trim_matches(['\'', '"']);
                    matching_name = name == id;
                }
            }
            if matching_name && closed {
                agents.insert(
                    id.clone(),
                    CliAgent {
                        id,
                        scope: scope.into(),
                    },
                );
            }
        }
    }
    Ok(agents.into_values().collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovers_valid_agents_with_project_precedence_without_leaking_instructions() {
        let root =
            std::env::temp_dir().join(format!("monocode-agy-agents-{}", uuid::Uuid::new_v4()));
        let home = root.join("home");
        let project = root.join("project");
        std::fs::create_dir_all(&project).unwrap();
        for (base, id, text) in [
            (
                home.join(".gemini/config/agents"),
                "reviewer",
                "---\nname: reviewer\n---\nSECRET INSTRUCTIONS",
            ),
            (
                project.join(".agents/agents"),
                "reviewer",
                "---\nname: 'reviewer'\n---\nLOCAL SECRET",
            ),
            (
                project.join(".agents/agents"),
                "builder",
                "---\nname: builder\n---\nBuild",
            ),
            (
                project.join(".agents/agents"),
                "wrong",
                "---\nname: another\n---\nBad",
            ),
        ] {
            let directory = base.join(id);
            std::fs::create_dir_all(&directory).unwrap();
            std::fs::write(directory.join("agent.md"), text).unwrap();
        }
        std::fs::write(
            project.join(".agents/agents/builder/agent.md"),
            format!("---\nname: builder\n---\n{}", "🦋".repeat(6000)),
        )
        .unwrap();
        let agents = discover_agents(&home, &project).unwrap();
        assert_eq!(agents.len(), 2);
        assert_eq!(agents[0].id, "builder");
        assert_eq!(agents[1].id, "reviewer");
        assert_eq!(agents[1].scope, "project");
        assert!(!serde_json::to_string(&agents).unwrap().contains("SECRET"));
        let other = root.join("other");
        std::fs::create_dir_all(&other).unwrap();
        assert_eq!(discover_agents(&home, &other).unwrap().len(), 1);
        assert!(discover_agents(&home, &root.join("missing")).is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
}
