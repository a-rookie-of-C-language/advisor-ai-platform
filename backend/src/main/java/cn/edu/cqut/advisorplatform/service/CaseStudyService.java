package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.entity.CaseStudy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CaseStudyService {

    Page<CaseStudy> list(String keyword, String category, Pageable pageable);

    CaseStudy getById(Long id);

    CaseStudy create(CaseStudy caseStudy);

    CaseStudy update(Long id, CaseStudy caseStudy);

    void delete(Long id);
}
