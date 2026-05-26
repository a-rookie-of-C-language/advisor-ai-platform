use crate::domain::core::quota_billing::GroupByDimension::GroupByDimension;
use crate::domain::core::quota_billing::UsageQuery::UsageQuery;

pub(crate) fn build_aggregate_sql(query: &UsageQuery) -> String {
    let mut select_cols = vec![
        "COUNT(*) AS request_count".to_string(),
        "COALESCE(SUM(prompt_tokens), 0) AS total_prompt_tokens".to_string(),
        "COALESCE(SUM(completion_tokens), 0) AS total_completion_tokens".to_string(),
        "COALESCE(SUM(total_tokens), 0) AS total_tokens".to_string(),
    ];
    let mut group_cols: Vec<String> = Vec::new();

    for dim in &query.group_by {
        match dim {
            GroupByDimension::Tenant => {
                select_cols.push("tenant_id".to_string());
                group_cols.push("tenant_id".to_string());
            }
            GroupByDimension::Model => {
                select_cols.push("model".to_string());
                group_cols.push("model".to_string());
            }
            GroupByDimension::Hour => {
                select_cols.push("date_trunc('hour', created_at) AS period_start".to_string());
                group_cols.push("date_trunc('hour', created_at)".to_string());
            }
            GroupByDimension::Day => {
                select_cols.push("date_trunc('day', created_at) AS period_start".to_string());
                group_cols.push("date_trunc('day', created_at)".to_string());
            }
        }
    }

    if query.group_by.is_empty() {
        select_cols.push("NULL AS period_start".to_string());
    }

    let (where_clause, param_idx) = build_where_clause(query);
    let mut sql = format!(
        "SELECT {} FROM token_usage_records{}",
        select_cols.join(", "),
        where_clause
    );

    if !group_cols.is_empty() {
        sql.push_str(&format!(" GROUP BY {}", group_cols.join(", ")));
    }

    sql.push_str(" ORDER BY total_tokens DESC");
    append_paging(&mut sql, query, param_idx);
    sql
}

pub(crate) fn build_list_sql(query: &UsageQuery) -> String {
    let (where_clause, param_idx) = build_where_clause(query);
    let mut sql = format!(
        "SELECT request_id, tenant_id, app_id, model, prompt_tokens, completion_tokens, total_tokens, created_at
         FROM token_usage_records{}",
        where_clause
    );

    sql.push_str(" ORDER BY created_at DESC");
    append_paging(&mut sql, query, param_idx);
    sql
}

fn build_where_clause(query: &UsageQuery) -> (String, usize) {
    let mut conditions: Vec<String> = Vec::new();
    let mut idx = 1usize;

    if query.tenant_id.is_some() {
        conditions.push(format!("tenant_id = ${}", idx));
        idx += 1;
    }
    if query.app_id.is_some() {
        conditions.push(format!("app_id = ${}", idx));
        idx += 1;
    }
    if query.model.is_some() {
        conditions.push(format!("model = ${}", idx));
        idx += 1;
    }
    if query.from.is_some() {
        conditions.push(format!("created_at >= ${}", idx));
        idx += 1;
    }
    if query.to.is_some() {
        conditions.push(format!("created_at <= ${}", idx));
        idx += 1;
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };

    (where_clause, idx)
}

fn append_paging(sql: &mut String, query: &UsageQuery, mut param_idx: usize) {
    if query.limit.is_some() {
        sql.push_str(&format!(" LIMIT ${}", param_idx));
        param_idx += 1;
    }
    if query.offset.is_some() {
        sql.push_str(&format!(" OFFSET ${}", param_idx));
    }
}
