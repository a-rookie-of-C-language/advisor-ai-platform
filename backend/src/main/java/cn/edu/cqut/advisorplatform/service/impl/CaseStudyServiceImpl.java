package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.CaseStudyDao;
import cn.edu.cqut.advisorplatform.entity.CaseStudy;
import cn.edu.cqut.advisorplatform.service.CaseStudyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CaseStudyServiceImpl implements CaseStudyService {

    private final CaseStudyDao caseStudyDao;

    @Override
    public Page<CaseStudy> list(String keyword, String category, Pageable pageable) {
        if (keyword != null && !keyword.isBlank()) {
            return caseStudyDao.searchByKeyword(keyword, pageable);
        }
        if (category != null && !category.isBlank()) {
            return caseStudyDao.findByCategory(category, pageable);
        }
        return caseStudyDao.findAll(pageable);
    }

    @Override
    public CaseStudy getById(Long id) {
        return caseStudyDao.findById(id)
            .orElseThrow(() -> new RuntimeException("案例不存在：" + id));
    }

    @Override
    public CaseStudy create(CaseStudy caseStudy) {
        return caseStudyDao.save(caseStudy);
    }

    @Override
    public CaseStudy update(Long id, CaseStudy caseStudy) {
        CaseStudy existing = getById(id);
        existing.setTitle(caseStudy.getTitle());
        existing.setContent(caseStudy.getContent());
        existing.setCategory(caseStudy.getCategory());
        existing.setTags(caseStudy.getTags());
        existing.setSchool(caseStudy.getSchool());
        return caseStudyDao.save(existing);
    }

    @Override
    public void delete(Long id) {
        caseStudyDao.deleteById(id);
    }
}
