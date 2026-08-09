package cn.edu.cqut.advisorplatform.gateway.filter.risk;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class RiskControlFilter implements GlobalFilter, Ordered {

  private final RiskControlSupport riskControlSupport;

  public RiskControlFilter(RiskControlSupport riskControlSupport) {
    this.riskControlSupport = riskControlSupport;
  }

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    return riskControlSupport.filter(exchange, chain);
  }

  @Override
  public int getOrder() {
    return -50;
  }
}
