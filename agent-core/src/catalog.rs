use serde::Serialize;

/// Provider/model capabilities consumed by routing and model listing surfaces.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct ModelCapability {
    pub(crate) provider: String,
    pub(crate) model: String,
    pub(crate) context_window_tokens: u32,
    pub(crate) supports_tools: bool,
    pub(crate) supports_reasoning: bool,
}

/// Deterministic model catalog. Exact model routes win over prefix routes.
#[derive(Default)]
pub(crate) struct ModelCatalog {
    entries: Vec<ModelCapability>,
}

impl ModelCatalog {
    pub(crate) fn register(&mut self, capability: ModelCapability) {
        self.entries.retain(|entry| {
            entry.provider != capability.provider || entry.model != capability.model
        });
        self.entries.push(capability);
    }

    pub(crate) fn list(&self, provider: &str) -> Vec<&ModelCapability> {
        self.entries
            .iter()
            .filter(|entry| entry.provider == provider)
            .collect()
    }

    pub(crate) fn resolve(&self, provider: &str, model: &str) -> Option<&ModelCapability> {
        self.entries
            .iter()
            .find(|entry| entry.provider == provider && entry.model == model)
            .or_else(|| {
                self.entries
                    .iter()
                    .filter(|entry| {
                        entry.provider == provider
                            && entry.model.ends_with('*')
                            && model
                                .starts_with(entry.model.strip_suffix('*').expect("checked suffix"))
                    })
                    .max_by_key(|entry| entry.model.len())
            })
    }
}

#[cfg(test)]
mod tests {
    use super::{ModelCapability, ModelCatalog};

    fn capability(model: &str, context_window_tokens: u32) -> ModelCapability {
        ModelCapability {
            provider: "openai".to_owned(),
            model: model.to_owned(),
            context_window_tokens,
            supports_tools: true,
            supports_reasoning: false,
        }
    }

    #[test]
    fn exact_route_wins_over_prefix_route() {
        let mut catalog = ModelCatalog::default();
        catalog.register(capability("gpt-4*", 16_000));
        catalog.register(capability("gpt-4.1", 128_000));

        assert_eq!(
            catalog
                .resolve("openai", "gpt-4.1")
                .expect("model exists")
                .context_window_tokens,
            128_000
        );
        assert_eq!(
            catalog
                .resolve("openai", "gpt-4o-mini")
                .expect("prefix exists")
                .context_window_tokens,
            16_000
        );
    }

    #[test]
    fn replacement_is_idempotent_and_listing_is_provider_scoped() {
        let mut catalog = ModelCatalog::default();
        catalog.register(capability("gpt-4.1", 128_000));
        catalog.register(capability("gpt-4.1", 256_000));
        catalog.register(ModelCapability {
            provider: "anthropic".to_owned(),
            ..capability("claude", 200_000)
        });

        assert_eq!(catalog.list("openai").len(), 1);
        assert_eq!(
            catalog
                .resolve("openai", "gpt-4.1")
                .unwrap()
                .context_window_tokens,
            256_000
        );
        assert!(catalog.resolve("openai", "unknown").is_none());
    }
}
