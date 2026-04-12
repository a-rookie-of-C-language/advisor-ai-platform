-- V3: 为知识库表添加 status 列
ALTER TABLE rag_knowledge_base 
ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'READY';
