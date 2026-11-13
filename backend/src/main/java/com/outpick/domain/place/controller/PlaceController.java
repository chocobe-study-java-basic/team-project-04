package com.outpick.domain.place.controller;

import com.outpick.domain.place.dto.PlacePageResponse;
import com.outpick.domain.place.dto.PlaceSearchRequest;
import com.outpick.domain.place.service.PlaceSearchService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/places")
@RequiredArgsConstructor
public class PlaceController {
    private final PlaceSearchService searchService;

    @GetMapping
    @Operation(summary = "공개 장소 검색", description = "장소명·별칭, 지역, 종목·시즌·실내외 및 지도 범위로 공개 장소만 조회합니다.")
    public PlacePageResponse search(@Valid @ModelAttribute @ParameterObject PlaceSearchRequest request) {
        return searchService.search(request);
    }
}
