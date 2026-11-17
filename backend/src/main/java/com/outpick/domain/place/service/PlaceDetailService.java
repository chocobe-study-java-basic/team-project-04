package com.outpick.domain.place.service;

import com.outpick.domain.place.dto.PlaceActivityResponse;
import com.outpick.domain.place.dto.PlaceDetailResponse;
import com.outpick.domain.place.entity.PlaceActivitySeason;
import com.outpick.domain.place.exception.PlaceErrorCode;
import com.outpick.domain.place.repository.PlaceDetailRepository;
import com.outpick.global.error.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlaceDetailService {
    private final PlaceDetailRepository repository;
    private final Clock placeClock;

    public PlaceDetailResponse getDetail(long placeId) {
        var place = repository.findPublishedPlace(placeId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_NOT_FOUND.getErrorCode()));
        var activities = repository.findActivities(placeId);
        var seasons = repository.findSeasons(placeId).stream().collect(Collectors.groupingBy(
                season -> season.getPlaceActivity().getId(),
                Collectors.mapping(PlaceActivitySeason::getSeason, Collectors.toList())));
        var activityResponses = activities.stream().map(activity -> new PlaceActivityResponse(
                activity.getId(), activity.getActivityType().getId(), activity.getActivityType().getName(),
                activity.getEnvironmentType(), seasons.getOrDefault(activity.getId(), List.of()))).toList();
        return new PlaceDetailResponse(place.getId(), place.getName(), place.getNameAlias(), place.getIntroduce(),
                place.getAddress(), place.getLatitude(), place.getLongitude(), place.getHomepage(), place.getOperationStatus(),
                place.getReviewedAt(), null, activityResponses,
                repository.findActiveNotices(placeId, LocalDateTime.now(placeClock)), repository.findVerifiedSources(placeId));
    }
}
