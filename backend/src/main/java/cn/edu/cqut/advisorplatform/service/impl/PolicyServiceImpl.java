package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.PolicyDao;
import cn.edu.cqut.advisorplatform.entity.Policy;
import cn.edu.cqut.advisorplatform.service.PolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PolicyServiceImpl implements PolicyService {

    private final PolicyDao policyDao;

    @Override
    public Page<Policy> list(String keyword, String category, Pageable pageable) {
        if (keyword != null && !keyword.isBlank()) {
            return policyDao.findByTitleContainingIgnoreCase(keyword, pageable);
        }
        if (category != null && !category.isBlank()) {
            return policyDao.findByCategory(category, pageable);
        }
        return policyDao.findAll(pageable);
    }

    @Override
    public Policy getById(Long id) {
        return policyDao.findById(id)
            .orElseThrow(() -> new RuntimeException("政策不存在：" + id));
    }

    @Override
    public Policy create(Policy policy) {
        return policyDao.save(policy);
    }

    @Override
    public Policy update(Long id, Policy policy) {
        Policy existing = getById(id);
        existing.setTitle(policy.getTitle());
        existing.setContent(policy.getContent());
        existing.setCategory(policy.getCategory());
        existing.setSource(policy.getSource());
        existing.setPublishedAt(policy.getPublishedAt());
        return policyDao.save(existing);
    }

    @Override
    public void delete(Long id) {
        policyDao.deleteById(id);
    }
}
