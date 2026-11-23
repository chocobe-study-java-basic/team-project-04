package com.outpick.domain.place.service;

import com.outpick.domain.member.entity.MemberRole;
import com.outpick.domain.member.service.MemberService;
import com.outpick.domain.place.dto.AdminPlaceNoticePageResponse;
import com.outpick.domain.place.dto.AdminPlaceNoticeRequest;
import com.outpick.domain.place.dto.AdminPlaceNoticeResponse;
import com.outpick.domain.place.dto.AdminPlaceRequest;
import com.outpick.domain.place.dto.AdminPlaceResponse;
import com.outpick.domain.place.entity.Place;
import com.outpick.domain.place.entity.PlaceNotice;
import com.outpick.domain.place.entity.PlacePublishStatus;
import com.outpick.domain.place.entity.SourceRecord;
import com.outpick.domain.place.exception.PlaceErrorCode;
import com.outpick.domain.place.repository.PlaceNoticeRepository;
import com.outpick.domain.place.repository.PlaceRepository;
import com.outpick.domain.place.repository.RegionRepository;
import com.outpick.domain.place.repository.SourceRecordRepository;
import com.outpick.domain.review.repository.ReviewReportRepository;
import com.outpick.global.error.BusinessException;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminPlaceService {
    private final MemberService members;
    private final PlaceRepository places;
    private final RegionRepository regions;
    private final ReviewReportRepository reports;
    private final PlaceNoticeRepository notices;
    private final SourceRecordRepository sources;

    public Map<String, Long> summary(long memberId) {
        requireAdmin(memberId);
        return Map.of("pendingReports", reports.countByStatus("PENDING"),
                "draftPlaces", places.countByPublishStatus(PlacePublishStatus.DRAFT),
                "publishedPlaces", places.countByPublishStatus(PlacePublishStatus.PUBLISHED));
    }

    public List<AdminPlaceResponse> recentPlaces(long memberId) {
        requireAdmin(memberId);
        return places.findAllByOrderByIdDesc(PageRequest.of(0, 20)).stream()
                .map(AdminPlaceResponse::from).toList();
    }

    @Transactional
    public AdminPlaceResponse createDraft(long memberId, AdminPlaceRequest request) {
        requireAdmin(memberId);
        var region = regions.findById(request.regionId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 지역입니다."));
        var place = Place.builder().region(region).name(request.name().trim())
                .address(request.address().trim()).introduce(request.description() == null ? null : request.description().trim())
                .latitude(request.latitude()).longitude(request.longitude())
                .publishStatus(PlacePublishStatus.DRAFT).build();
        return AdminPlaceResponse.from(places.save(place));
    }

    public AdminPlaceNoticePageResponse notices(long memberId, long placeId, int page, int size) {
        requireAdmin(memberId);
        if (!places.existsById(placeId)) {
            throw new BusinessException(PlaceErrorCode.PLACE_NOT_FOUND.getErrorCode());
        }
        var result = notices.findAllByPlaceIdOrderByIdDesc(placeId, PageRequest.of(page, size));
        return new AdminPlaceNoticePageResponse(result.map(AdminPlaceNoticeResponse::from).getContent(),
                page, size, result.getTotalElements());
    }

    @Transactional
    public AdminPlaceNoticeResponse createNoticeDraft(long memberId, long placeId, AdminPlaceNoticeRequest request) {
        requireAdmin(memberId);
        var place = places.findById(placeId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_NOT_FOUND.getErrorCode()));
        var source = resolveNoticeSource(memberId, place, request);
        var notice = PlaceNotice.builder().place(place).sourceRecord(source)
                .title(request.title()).content(request.content())
                .validFrom(request.validFrom()).validUntil(request.validUntil()).build();
        return AdminPlaceNoticeResponse.from(notices.save(notice));
    }

    @Transactional
    public AdminPlaceNoticeResponse updateNoticeDraft(long memberId, long placeId, long noticeId,
                                                     AdminPlaceNoticeRequest request) {
        requireAdmin(memberId);
        var notice = notices.findByIdAndPlaceId(noticeId, placeId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_NOTICE_NOT_FOUND.getErrorCode()));
        if (notice.getPublishStatus() != PlacePublishStatus.DRAFT) {
            throw new BusinessException(PlaceErrorCode.PLACE_NOTICE_NOT_DRAFT.getErrorCode());
        }
        var source = resolveNoticeSource(memberId, notice.getPlace(), request);
        notice.revise(source, request.title(), request.content(), request.validFrom(), request.validUntil());
        return AdminPlaceNoticeResponse.from(notice);
    }

    /**
     * 기존 출처는 같은 장소에서만 찾습니다. 새 출처를 확인했다면 공지와 함께 저장하고 공유 출처는 그대로 둡니다.
     */
    private SourceRecord resolveNoticeSource(long memberId, Place place, AdminPlaceNoticeRequest request) {
        if (request.sourceRecordId() != null) {
            return sources.findByIdAndPlaceId(request.sourceRecordId(), place.getId())
                    .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_NOTICE_INVALID_SOURCE.getErrorCode()));
        }
        var source = request.source();
        return sources.save(SourceRecord.builder().place(place).type("OFFICIAL").url(source.url())
                .verifiedFields(SourceRecord.VERIFIED_FIELD_NOTICE).verifiedAt(source.verifiedAt())
                .verifierId(memberId).build());
    }

    private void requireAdmin(long memberId) {
        if (members.findActiveMember(memberId).getRole() != MemberRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "운영자만 이용할 수 있습니다.");
        }
    }
}
