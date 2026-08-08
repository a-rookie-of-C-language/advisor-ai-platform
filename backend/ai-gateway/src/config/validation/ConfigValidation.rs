use std::fmt;

use super::Config;

#[derive(Debug)]
pub enum ConfigError {
    MissingMasterApiKey { env: String },
    MissingProviderApiKey { env: String },
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConfigError::MissingMasterApiKey { env } => {
                write!(
                    f,
                    "APP_ENV is '{}' but MASTER_API_KEY is empty. \
                     Set a secure MASTER_API_KEY before starting in non-dev environments.",
                    env
                )
            }
            ConfigError::MissingProviderApiKey { env } => {
                write!(
                    f,
                    "APP_ENV is '{}' but PROVIDER_API_KEY is empty. \
                     Set a valid PROVIDER_API_KEY before starting in non-dev environments.",
                    env
                )
            }
        }
    }
}

impl std::error::Error for ConfigError {}

pub fn validate_config(config: &Config) -> Result<(), ConfigError> {
    if config.app_env != "dev" && config.master_api_key.is_empty() {
        return Err(ConfigError::MissingMasterApiKey {
            env: config.app_env.clone(),
        });
    }
    if config.app_env != "dev" && config.provider_api_key.is_empty() {
        return Err(ConfigError::MissingProviderApiKey {
            env: config.app_env.clone(),
        });
    }
    Ok(())
}
