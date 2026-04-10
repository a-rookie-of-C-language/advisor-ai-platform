package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.MethodDao;
import cn.edu.cqut.advisorplatform.entity.Method;
import cn.edu.cqut.advisorplatform.service.MethodService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MethodServiceImpl implements MethodService {

    private final MethodDao methodDao;

    @Override
    public Page<Method> list(String keyword, String scenario, Pageable pageable) {
        if (keyword != null && !keyword.isBlank()) {
            return methodDao.findByTitleContainingIgnoreCase(keyword, pageable);
        }
        if (scenario != null && !scenario.isBlank()) {
            return methodDao.findByScenario(scenario, pageable);
        }
        return methodDao.findAll(pageable);
    }

    @Override
    public Method getById(Long id) {
        return methodDao.findById(id)
            .orElseThrow(() -> new RuntimeException("方法不存在：" + id));
    }

    @Override
    public Method create(Method method) {
        return methodDao.save(method);
    }

    @Override
    public Method update(Long id, Method method) {
        Method existing = getById(id);
        existing.setTitle(method.getTitle());
        existing.setDescription(method.getDescription());
        existing.setSteps(method.getSteps());
        existing.setScenario(method.getScenario());
        existing.setTags(method.getTags());
        return methodDao.save(existing);
    }

    @Override
    public void delete(Long id) {
        methodDao.deleteById(id);
    }
}
