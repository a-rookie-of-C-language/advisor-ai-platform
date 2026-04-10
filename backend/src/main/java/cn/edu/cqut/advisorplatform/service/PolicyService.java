package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.entity.Policy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PolicyService {

    Page<Policy> list(String keyword, String category, Pageable pageable);

    Policy getById(Long id);

    Policy create(Policy policy);

    Policy update(Long id, Policy policy);

    void delete(Long id);
}
