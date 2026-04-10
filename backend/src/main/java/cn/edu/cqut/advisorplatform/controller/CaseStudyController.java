package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.entity.CaseStudy;
import cn.edu.cqut.advisorplatform.service.CaseStudyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cases")
@RequiredArgsConstructor
public class CaseStudyController {

    private final CaseStudyService caseStudyService;

    @GetMapping
    public ApiResponse<Page<CaseStudy>> list(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String category,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ApiResponse.success(caseStudyService.list(keyword, category, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<CaseStudy> getById(@PathVariable Long id) {
        return ApiResponse.success(caseStudyService.getById(id));
    }

    @PostMapping
    public ApiResponse<CaseStudy> create(@RequestBody CaseStudy caseStudy) {
        return ApiResponse.success(caseStudyService.create(caseStudy));
    }

    @PutMapping("/{id}")
    public ApiResponse<CaseStudy> update(@PathVariable Long id, @RequestBody CaseStudy caseStudy) {
        return ApiResponse.success(caseStudyService.update(id, caseStudy));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        caseStudyService.delete(id);
        return ApiResponse.success();
    }
}
