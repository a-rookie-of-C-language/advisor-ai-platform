package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.entity.Method;
import cn.edu.cqut.advisorplatform.service.MethodService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/methods")
@RequiredArgsConstructor
public class MethodController {

    private final MethodService methodService;

    @GetMapping
    public ApiResponse<Page<Method>> list(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String scenario,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ApiResponse.success(methodService.list(keyword, scenario, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<Method> getById(@PathVariable Long id) {
        return ApiResponse.success(methodService.getById(id));
    }

    @PostMapping
    public ApiResponse<Method> create(@RequestBody Method method) {
        return ApiResponse.success(methodService.create(method));
    }

    @PutMapping("/{id}")
    public ApiResponse<Method> update(@PathVariable Long id, @RequestBody Method method) {
        return ApiResponse.success(methodService.update(id, method));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        methodService.delete(id);
        return ApiResponse.success();
    }
}
