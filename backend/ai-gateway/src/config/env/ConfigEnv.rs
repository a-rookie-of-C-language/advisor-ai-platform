use std::env;
use std::str::FromStr;

pub fn env_or(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

pub fn env_parse_or<T>(key: &str, default: T) -> T
where
    T: FromStr + Copy,
{
    env::var(key)
        .ok()
        .and_then(|value| value.parse::<T>().ok())
        .unwrap_or(default)
}

pub fn env_optional(key: &str) -> Option<String> {
    env::var(key).ok()
}
