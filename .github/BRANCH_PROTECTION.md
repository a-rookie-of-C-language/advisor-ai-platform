# 分支保护配置指南

## 配置步骤

### 1. 进入仓库设置

1. 打开 GitHub 仓库页面
2. 点击 **Settings** 选项卡
3. 在左侧菜单中点击 **Branches**

### 2. 添加分支保护规则

1. 点击 **Add rule** 按钮
2. 在 **Branch name pattern** 中输入：`master` 或 `main`
3. 勾选以下选项：

#### 必需的状态检查

- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**

在 **Status checks that are required** 中添加：
- `DeepEval Agent Evaluation`

#### 其他推荐设置

- ✅ **Require pull request reviews before merging**
  - Required approving reviews: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ **Require conversation resolution before merging**
- ✅ **Do not allow bypassing the above settings**

### 3. 保存规则

点击 **Create** 或 **Save changes** 按钮保存配置。

---

## 配置 Secrets

在仓库的 **Settings > Secrets and variables > Actions** 中添加以下 secrets：

| Secret 名称 | 说明 | 示例 |
|-------------|------|------|
| `OPENAI_API_KEY` | OpenAI API Key | `sk-xxx` |
| `OPENAI_BASE_URL` | API Base URL | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 模型名称 | `gpt-4o-mini` |

---

## 评估指标阈值（12 个指标）

以下指标低于阈值时，CI 将失败，PR 无法合并：

### RAG 质量指标（5个）

| 指标 | 阈值 | 说明 |
|------|------|------|
| 忠实度 (Faithfulness) | 0.80 | 答案是否基于检索上下文 |
| 答案相关性 (Answer Relevancy) | 0.80 | 答案与问题的相关程度 |
| 上下文精度 (Contextual Precision) | 0.80 | 检索上下文与问题的相关性 |
| 上下文召回率 (Contextual Recall) | 0.70 | 期望答案是否被上下文覆盖 |
| 上下文相关性 (Contextual Relevancy) | 0.80 | 上下文内容的相关性 |

### 安全指标（4个）

| 指标 | 阈值 | 说明 |
|------|------|------|
| 幻觉检测 (Hallucination) | 0.80 | 越低越好，0.00 表示无幻觉 |
| 偏见检测 (Bias) | 0.80 | 越低越好，0.00 表示无偏见 |
| 毒性检测 (Toxicity) | 0.80 | 越低越好，0.00 表示无毒性 |
| 隐私泄露检测 (PII Leakage) | 0.80 | 越低越好，0.00 表示无泄露 |

### 回答质量指标（3个）

| 指标 | 阈值 | 说明 |
|------|------|------|
| 相关性 (Relevance) | 0.80 | 回答与问题的相关程度 |
| 连贯性 (Coherence) | 0.80 | 回答的逻辑流畅性 |
| 完整性 (Completeness) | 0.80 | 回答是否覆盖问题的所有方面 |

---

## 本地测试

在提交 PR 前，可以本地运行评估测试：

```bash
cd agent
source .venv/Scripts/activate
DEEPEVAL_PER_ATTEMPT_TIMEOUT_SECONDS_OVERRIDE=300 python -m pytest tests/test_evaluation.py -v
```

---

## 故障排除

### CI 失败原因

1. **上下文召回率低于阈值**
   - 原因：期望答案包含检索上下文未覆盖的信息
   - 解决：补充检索上下文或调整期望答案

2. **连贯性低于阈值**
   - 原因：答案格式不符合评估标准
   - 解决：优化答案结构，添加段落和逻辑连接词

3. **幻觉检测分数过高**
   - 原因：答案包含未在上下文中出现的信息
   - 解决：确保答案基于检索上下文

4. **超时错误**
   - 原因：评估时间过长
   - 解决：增加 `DEEPEVAL_PER_ATTEMPT_TIMEOUT_SECONDS_OVERRIDE` 值
