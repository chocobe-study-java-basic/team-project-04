package com.outpick.domain.place.service;

import com.outpick.domain.member.entity.MemberRole;
import com.outpick.domain.member.service.MemberService;
import com.outpick.domain.place.dto.AdminPlaceRequest;
import com.outpick.domain.place.dto.AdminPlaceResponse;
import com.outpick.domain.place.entity.Place;
import com.outpick.domain.place.entity.PlacePublishStatus;
import com.outpick.domain.place.repository.PlaceRepository;
import com.outpick.domain.place.repository.RegionRepository;
import com.outpick.domain.review.repository.ReviewReportRepository;
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

    private void requireAdmin(long memberId) {
        if (members.findActiveMember(memberId).getRole() != MemberRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "운영자만 이용할 수 있습니다.");
        }
    }
}
