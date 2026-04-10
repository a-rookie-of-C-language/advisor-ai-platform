package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.entity.Policy;
import cn.edu.cqut.advisorplatform.service.PolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/policies")
@RequiredArgsConstructor
public class PolicyController {

    private final PolicyService policyService;

    @GetMapping
    public ApiResponse<Page<Policy>> list(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String category,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ApiResponse.success(policyService.list(keyword, category, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<Policy> getById(@PathVariable Long id) {
        return ApiResponse.success(policyService.getById(id));
    }

    @PostMapping
    public ApiResponse<Policy> create(@RequestBody Policy policy) {
        return ApiResponse.success(policyService.create(policy));
    }

    @PutMapping("/{id}")
    public ApiResponse<Policy> update(@PathVariable Long id, @RequestBody Policy policy) {
        return ApiResponse.success(policyService.update(id, policy));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        policyService.delete(id);
        return ApiResponse.success();
    }
}
