package com.outpick.domain.place.service;

import com.outpick.domain.place.dto.PlacePageResponse;
import com.outpick.domain.place.dto.PlaceSearchRequest;
import com.outpick.domain.place.repository.PlaceSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlaceSearchService {
    private final PlaceSearchRepository repository;

    public PlacePageResponse search(PlaceSearchRequest request) {
        return repository.search(request);
    }
}
