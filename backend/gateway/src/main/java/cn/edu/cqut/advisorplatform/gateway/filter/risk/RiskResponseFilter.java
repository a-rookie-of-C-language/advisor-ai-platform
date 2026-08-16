package cn.edu.cqut.advisorplatform.gateway.filter.risk;

import java.util.List;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class RiskResponseFilter implements GlobalFilter, Ordered {

  private static final List<String> RISK_CHECK_PATHS =
      List.of("/api/chat/", "/api/session/", "/api/rag/", "/api/memory/");
  private static final String CHAT_STREAM_PATH = "/api/chat/stream";
  private static final String RAG_DOCUMENT_UPLOAD_PATH_PREFIX = "/api/rag/knowledge-bases/";
  private static final String RAG_DOCUMENT_UPLOAD_PATH_SUFFIX = "/documents";

  private final RiskResponseSupport support;

  public RiskResponseFilter(RiskResponseSupport support) {
    this.support = support;
  }

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    String path = exchange.getRequest().getURI().getPath();
    if (!RISK_CHECK_PATHS.stream().anyMatch(path::startsWith)) {
      return chain.filter(exchange);
    }
    if (isRagDocumentUploadPath(path)) {
      return chain.filter(exchange);
    }
    if (CHAT_STREAM_PATH.equals(path) || exchange.getRequest().getMethod() != HttpMethod.POST) {
      return chain.filter(exchange);
    }
    return support.filter(exchange, chain);
  }

  private boolean isRagDocumentUploadPath(String path) {
    return path != null
        && path.startsWith(RAG_DOCUMENT_UPLOAD_PATH_PREFIX)
        && path.endsWith(RAG_DOCUMENT_UPLOAD_PATH_SUFFIX);
  }

  @Override
  public int getOrder() {
    return -1;
  }
}
