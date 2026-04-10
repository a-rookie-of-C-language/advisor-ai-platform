package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.TrainingDao;
import cn.edu.cqut.advisorplatform.entity.Training;
import cn.edu.cqut.advisorplatform.service.TrainingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TrainingServiceImpl implements TrainingService {

    private final TrainingDao trainingDao;

    @Override
    public Page<Training> list(String keyword, String type, Pageable pageable) {
        if (keyword != null && !keyword.isBlank()) {
            return trainingDao.findByTitleContainingIgnoreCase(keyword, pageable);
        }
        if (type != null && !type.isBlank()) {
            return trainingDao.findByType(type, pageable);
        }
        return trainingDao.findAll(pageable);
    }

    @Override
    public Training getById(Long id) {
        return trainingDao.findById(id)
            .orElseThrow(() -> new RuntimeException("培训资源不存在：" + id));
    }

    @Override
    public Training create(Training training) {
        return trainingDao.save(training);
    }

    @Override
    public Training update(Long id, Training training) {
        Training existing = getById(id);
        existing.setTitle(training.getTitle());
        existing.setDescription(training.getDescription());
        existing.setType(training.getType());
        existing.setResourceUrl(training.getResourceUrl());
        existing.setScheduledAt(training.getScheduledAt());
        return trainingDao.save(existing);
    }

    @Override
    public void delete(Long id) {
        trainingDao.deleteById(id);
    }
}
