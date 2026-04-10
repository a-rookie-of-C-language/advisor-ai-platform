package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.entity.Method;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MethodService {

    Page<Method> list(String keyword, String scenario, Pageable pageable);

    Method getById(Long id);

    Method create(Method method);

    Method update(Long id, Method method);

    void delete(Long id);
}
