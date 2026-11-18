package com.outpick.domain.place.controller;

import com.outpick.domain.place.dto.PlacePageResponse;
import com.outpick.domain.place.dto.PlaceDetailResponse;
import com.outpick.domain.place.dto.PlaceFilterResponse;
import com.outpick.domain.place.dto.PlaceSearchRequest;
import com.outpick.domain.place.service.PlaceSearchService;
import com.outpick.domain.place.service.PlaceDetailService;
import com.outpick.domain.place.service.PlaceFilterService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/places")
@RequiredArgsConstructor
public class PlaceController {
    private final PlaceSearchService searchService;
    private final PlaceDetailService detailService;
    private final PlaceFilterService filterService;

    @GetMapping("/filters")
    @Operation(summary = "장소 검색 필터 선택지", description = "최상위 지역 ID와 분류별 종목 ID를 반환합니다.")
    public PlaceFilterResponse getFilters() {
        return filterService.getFilters();
    }

    @GetMapping
    @Operation(summary = "공개 장소 검색", description = "장소명·별칭, 지역, 종목·시즌·실내외 및 지도 범위로 공개 장소만 조회합니다.")
    public PlacePageResponse search(@Valid @ModelAttribute @ParameterObject PlaceSearchRequest request) {
        return searchService.search(request);
    }

    @GetMapping("/{placeId}")
    @Operation(summary = "공개 장소 상세", description = "공개 장소의 활동·시즌·확인된 출처·유효한 공개 공지를 조회합니다.")
    public PlaceDetailResponse getDetail(@PathVariable("placeId") @Positive(message = "장소 ID는 1 이상이어야 합니다.") long placeId) {
        return detailService.getDetail(placeId);
    }
}
