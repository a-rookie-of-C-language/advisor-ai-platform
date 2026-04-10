package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.entity.Training;
import cn.edu.cqut.advisorplatform.service.TrainingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trainings")
@RequiredArgsConstructor
public class TrainingController {

    private final TrainingService trainingService;

    @GetMapping
    public ApiResponse<Page<Training>> list(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String type,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ApiResponse.success(trainingService.list(keyword, type, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<Training> getById(@PathVariable Long id) {
        return ApiResponse.success(trainingService.getById(id));
    }

    @PostMapping
    public ApiResponse<Training> create(@RequestBody Training training) {
        return ApiResponse.success(trainingService.create(training));
    }

    @PutMapping("/{id}")
    public ApiResponse<Training> update(@PathVariable Long id, @RequestBody Training training) {
        return ApiResponse.success(trainingService.update(id, training));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        trainingService.delete(id);
        return ApiResponse.success();
    }
}
