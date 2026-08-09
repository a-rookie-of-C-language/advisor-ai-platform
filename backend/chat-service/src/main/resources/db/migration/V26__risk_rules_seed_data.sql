-- ============================================================
-- 风控规则种子数据
-- 适用于：高校辅导员AI咨询平台（严格模式）
-- 方向：INPUT=用户输入, OUTPUT=AI输出, BOTH=双向
-- 动作：reject=拒绝, review=人工复核, challenge=需验证
-- ============================================================

-- ==================== 内容安全规则 (content_safety) ====================

-- 暴力恐怖
INSERT INTO risk_rules (rule_type, name, pattern, action, severity, direction, enabled) VALUES
('content_safety', '暴力威胁', '(杀[了死人]?|砍[死杀]?|捅[死杀]?|炸[毁掉]?|枪[击毙]?|捅刀|持刀|持枪|爆炸物|炸弹|自杀|自残|跳楼|割腕)', 'reject', 'critical', 'BOTH', true),
('content_safety', '恐怖主义', '(恐怖袭击|恐怖分子|恐怖组织|ISIS|基地组织|圣战|人肉炸弹|汽车炸弹)', 'reject', 'critical', 'BOTH', true);

-- 色情低俗
INSERT INTO risk_rules (rule_type, name, pattern, action, severity, direction, enabled) VALUES
('content_safety', '色情内容', '(色情|淫秽|嫖[娼客]?|卖淫|性[交易服务]|约炮|一夜情|裸[聊体照]|黄[片色站]|AV女优|成人视频)', 'reject', 'critical', 'BOTH', true),
('content_safety', '低俗内容', '(操你妈|妈的|狗日的|傻逼|煞笔|草泥马|卧槽|我靠|你妈死了)', 'reject', 'high', 'BOTH', true);

-- 政治敏感
INSERT INTO risk_rules (rule_type, name, pattern, action, severity, direction, enabled) VALUES
('content_safety', '政治敏感词', '(六四|天安门事件|文化大革命|大跃进|反右|法轮功|达赖|台独|藏独|疆独|港独|颠覆政权|推翻政府)', 'reject', 'critical', 'BOTH', true),
('content_safety', '领导人相关', '(习近平|毛泽东|邓小平|江泽民|胡锦涛).{0,10}(死|下台|腐败|独裁|暴政)', 'reject', 'critical', 'BOTH', true);

-- 违法信息
INSERT INTO risk_rules (rule_type, name, pattern, action, severity, direction, enabled) VALUES
('content_safety', '赌博信息', '(赌博|赌[博球钱]|博彩|彩票[预测内幕]|网赌|赌场|老虎机|百家乐|六合彩|时时彩)', 'reject', 'high', 'BOTH', true),
('content_safety', '毒品信息', '(毒品|吸毒|贩毒|冰毒|海洛因|大麻|摇头丸|K粉|可卡因|制毒)', 'reject', 'critical', 'BOTH', true);

-- ==================== Prompt注入规则 (prompt_injection) ====================

-- 系统指令泄露
INSERT INTO risk_rules (rule_type, name, pattern, action, severity, direction, enabled) VALUES
('prompt_injection', '系统提示词泄露', '(忽略|无视|忘记|跳过).{0,20}(之前的|上面的|系统|system|prompt|指令|规则)', 'reject', 'high', 'INPUT', true),
('prompt_injection', '角色扮演绕过', '(你现在是|假装你是|扮演|角色扮演|DAN|Do Anything Now|开发者模式|越狱)', 'reject', 'high', 'INPUT', true);

-- 指令注入
INSERT INTO risk_rules (rule_type, name, pattern, action, severity, direction, enabled) VALUES
('prompt_injection', '指令注入-英文', '(ignore|forget|disregard).{0,20}(previous|above|system|instructions|rules)', 'reject', 'high', 'INPUT', true),
('prompt_injection', '提示词注入', '(\[INST\]|\[/INST\]|<\|im_start\|>|<\|im_end\|>|<\|system\|>|<\|user\|>|<\|assistant\|>)', 'reject', 'high', 'INPUT', true);

-- 越狱攻击
INSERT INTO risk_rules (rule_type, name, pattern, action, severity, direction, enabled) VALUES
('prompt_injection', '越狱攻击', '(jailbreak|越狱|突破限制|绕过审核|解除限制|无限制模式|无过滤)', 'reject', 'high', 'INPUT', true),
('prompt_injection', '编码绕过', '(base64|rot13|unicode|url编码|hex编码|十六进制).{0,10}(解码|decode|转换)', 'reject', 'medium', 'INPUT', true);

-- ==================== 业务合规规则 (business_compliance) ====================

-- 学术不端
INSERT INTO risk_rules (rule_type, name, pattern, action, severity, direction, enabled) VALUES
('business_compliance', '代写论文', '(代写|代做|代发|论文代写|毕业论文代写|论文[买卖枪手]|代考|替考)', 'reject', 'high', 'BOTH', true),
('business_compliance', '考试作弊', '(考试作弊|考试答案|泄题|卖答案|枪手|替考|小抄|夹带|传答案)', 'reject', 'high', 'BOTH', true);

-- 违规服务
INSERT INTO risk_rules (rule_type, name, pattern, action, severity, direction, enabled) VALUES
('business_compliance', '学历造假', '(假学历|假文凭|假学位|学历造假|买学历|买文凭|野鸡大学|学历认证[造假代办])', 'reject', 'high', 'BOTH', true),
('business_compliance', '非法中介', '(黑中介|非法中介|骗子中介|诈骗[团伙公司]|传销|非法集资|庞氏骗局)', 'reject', 'high', 'BOTH', true);
