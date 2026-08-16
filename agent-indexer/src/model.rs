use serde_json::Value;

#[derive(Clone, Debug)]
pub struct Document {
    pub file_path: String,
    pub file_type: String,
}

#[derive(Clone, Debug)]
pub struct Chunk {
    pub index: i32,
    pub content: String,
    pub metadata: Value,
}
