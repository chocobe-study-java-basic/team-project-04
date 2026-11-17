package com.outpick.domain.favorite.service;

import com.outpick.domain.favorite.repository.FavoriteRepository;
import com.outpick.domain.member.service.MemberService;
import com.outpick.domain.place.dto.PlaceSummaryResponse;
import com.outpick.domain.place.entity.PlacePublishStatus;
import com.outpick.domain.place.exception.PlaceErrorCode;
import com.outpick.domain.place.repository.PlaceRepository;
import com.outpick.global.error.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FavoriteService {
    private final FavoriteRepository favoriteRepository;
    private final PlaceRepository placeRepository;
    private final MemberService memberService;

    public List<PlaceSummaryResponse> findPlaces(Long memberId) {
        memberService.findActiveMember(memberId);
        return favoriteRepository.findPlaces(memberId, PlacePublishStatus.PUBLISHED);
    }

    @Transactional
    public void save(Long memberId, long placeId) {
        memberService.findActiveMember(memberId);
        if (!placeRepository.existsByIdAndPublishStatus(placeId, PlacePublishStatus.PUBLISHED)) {
            throw new BusinessException(PlaceErrorCode.PLACE_NOT_FOUND.getErrorCode());
        }
        favoriteRepository.saveIfAbsent(memberId, placeId);
    }

    @Transactional
    public void remove(Long memberId, long placeId) {
        memberService.findActiveMember(memberId);
        favoriteRepository.deleteForMember(memberId, placeId);
    }
}
