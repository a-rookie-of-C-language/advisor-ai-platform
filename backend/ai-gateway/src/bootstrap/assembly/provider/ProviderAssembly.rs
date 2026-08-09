use std::collections::HashMap;
use std::sync::Arc;

use anyhow::Result;

use crate::application::chat::ChatAppService::ChatAppService;
use crate::application::chat::ChatService::ChatService;
use crate::config::Config;
use crate::domain::core::gateway_orchestration::ChatGateway::ChatGateway;
use crate::domain::supporting::provider_integration::ProviderDescriptor::ProviderDescriptor;
use crate::domain::supporting::provider_integration::ProviderRouter::ProviderRouter;
use crate::infrastructure::provider::DefaultProviderRouter::DefaultProviderRouter;
use crate::infrastructure::provider::OpenAICompatibleGateway::OpenAICompatibleGateway;

pub fn build_chat_service(cfg: &Config) -> Result<Arc<dyn ChatService>> {
    let provider = Arc::new(OpenAICompatibleGateway::new(
        cfg.provider_base_url.clone(),
        cfg.provider_api_key.clone(),
        cfg.provider_model.clone(),
        cfg.provider_timeout_sec,
    )?);

    let mut gateways: HashMap<String, Arc<dyn ChatGateway>> = HashMap::new();
    gateways.insert("openai".to_string(), provider);

    let provider_descriptor = ProviderDescriptor {
        provider_code: "openai".to_string(),
        base_url: cfg.provider_base_url.clone(),
        api_key: cfg.provider_api_key.clone(),
        enabled: true,
        models: vec![],
    };

    let router: Arc<dyn ProviderRouter> = Arc::new(DefaultProviderRouter::new(
        vec![provider_descriptor],
        "openai",
    ));

    Ok(Arc::new(ChatAppService::new(gateways, router)))
}
