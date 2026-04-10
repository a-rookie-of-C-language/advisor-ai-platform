package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.entity.Training;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TrainingService {

    Page<Training> list(String keyword, String type, Pageable pageable);

    Training getById(Long id);

    Training create(Training training);

    Training update(Long id, Training training);

    void delete(Long id);
}
