package com.outpick.domain.favorite.service;

import com.outpick.domain.favorite.dto.FavoritePlaceResponse;
import com.outpick.domain.favorite.exception.FavoriteErrorCode;
import com.outpick.domain.favorite.repository.FavoritePlaceRow;
import com.outpick.domain.favorite.repository.FavoriteRepository;
import com.outpick.domain.member.service.MemberService;
import com.outpick.domain.place.dto.PlaceSummaryResponse;
import com.outpick.domain.place.entity.PlacePublishStatus;
import com.outpick.domain.place.exception.PlaceErrorCode;
import com.outpick.domain.place.repository.PlaceRepository;
import com.outpick.global.error.BusinessException;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FavoriteService {
    private final FavoriteRepository favoriteRepository;
    private final PlaceRepository placeRepository;
    private final MemberService memberService;
    private final Clock clock;

    public List<FavoritePlaceResponse> findPlaces(Long memberId) {
        memberService.findActiveMember(memberId);
        return favoriteRepository.findPlaces(memberId, List.of(PlacePublishStatus.PUBLISHED, PlacePublishStatus.HIDDEN))
                .stream()
                .map(FavoriteService::toPlaceResponse)
                .toList();
    }

    private static FavoritePlaceResponse toPlaceResponse(FavoritePlaceRow row) {
        if (row.publishStatus() == PlacePublishStatus.PUBLISHED) {
            var summary = new PlaceSummaryResponse(
                    row.id(), row.name(), row.address(), row.latitude(), row.longitude(),
                    row.representativeImage(), row.imageAttribution(), row.imageSourceUrl(), row.imageLicense());
            return new FavoritePlaceResponse.Published(summary, row.isNotified(), row.publishStatus());
        }
        return new FavoritePlaceResponse.Unavailable(row.id(), row.name(), row.publishStatus());
    }

    @Transactional
    public void changeNotificationSetting(Long memberId, long placeId, boolean enabled) {
        memberService.findActiveMember(memberId);
        var favorite = favoriteRepository.findForNotificationUpdate(memberId, placeId, PlacePublishStatus.PUBLISHED)
                .orElseThrow(() -> new BusinessException(FavoriteErrorCode.FAVORITE_NOT_FOUND.getErrorCode()));
        favorite.changeNotificationSetting(enabled, LocalDateTime.now(clock));
    }

    @Transactional
    public void save(Long memberId, long placeId) {
        memberService.findActiveMember(memberId);
        if (!placeRepository.existsByIdAndPublishStatus(placeId, PlacePublishStatus.PUBLISHED)) {
            throw new BusinessException(PlaceErrorCode.PLACE_NOT_FOUND.getErrorCode());
        }
        try {
            favoriteRepository.insert(memberId, placeId);
        } catch (DataIntegrityViolationException exception) {
            if (exception.getCause() instanceof ConstraintViolationException violation
                    && violation.getErrorCode() == 1062
                    && violation.getConstraintName() != null
                    && (violation.getConstraintName().equals("uk_favorite_user_place")
                    || violation.getConstraintName().endsWith(".uk_favorite_user_place"))) {
                throw new BusinessException(FavoriteErrorCode.FAVORITE_ALREADY_EXISTS.getErrorCode());
            }
            throw exception;
        }
    }

    @Transactional
    public void remove(Long memberId, long placeId) {
        memberService.findActiveMember(memberId);
        favoriteRepository.deleteForMember(memberId, placeId);
    }
}
