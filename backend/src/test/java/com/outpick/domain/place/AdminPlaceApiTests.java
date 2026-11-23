package com.outpick.domain.place;

import com.jayway.jsonpath.JsonPath;
import com.outpick.domain.place.entity.Place;
import com.outpick.domain.place.entity.PlaceNotice;
import com.outpick.domain.place.entity.PlacePublishStatus;
import com.outpick.domain.place.entity.Region;
import com.outpick.domain.place.entity.SourceRecord;
import com.outpick.domain.place.repository.PlaceNoticeRepository;
import com.outpick.domain.place.repository.PlaceRepository;
import com.outpick.domain.place.repository.RegionRepository;
import com.outpick.domain.place.repository.SourceRecordRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@AutoConfigureMockMvc
@Testcontainers
@Transactional
class AdminPlaceApiTests {
    @Container @ServiceConnection
    static MySQLContainer mysql = new MySQLContainer("mysql:8.4.13");

    @Autowired MockMvc mvc;
    @Autowired RegionRepository regions;
    @Autowired PlaceRepository places;
    @Autowired PlaceNoticeRepository notices;
    @Autowired SourceRecordRepository sources;
    @Autowired EntityManager entityManager;

    @Test
    @DisplayName("운영자가 추가한 장소는 초안으로 저장되고 공개 검색에는 보이지 않는다")
    void adminCreatesPrivateDraft() throws Exception {
        long regionId = regions.saveAndFlush(Region.builder().code("ADMIN-TEST").name("관리자 테스트 지역").build()).getId();
        var admin = login("admin@example.com", "12341234");

        mvc.perform(post("/api/v1/admin/places").session(admin.session())
                        .header(admin.header(), admin.token()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"regionId":%d,"name":"관리자 등록 장소","address":"테스트 주소",
                                 "description":"검토 전 초안","latitude":37.5,"longitude":127.1}
                                """.formatted(regionId)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("DRAFT"));

        mvc.perform(get("/api/v1/admin/places").session(admin.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("관리자 등록 장소"));
        mvc.perform(get("/api/v1/places").param("query", "관리자 등록 장소"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    @DisplayName("일반 회원은 운영 현황과 장소 등록에 접근할 수 없다")
    void memberCannotUseAdminPlaces() throws Exception {
        var guest = mvc.perform(get("/api/v1/admin/dashboard"));
        guest.andExpect(status().isUnauthorized());
        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        var session = (MockHttpSession) csrf.getRequest().getSession(false);
        var json = JsonPath.parse(csrf.getResponse().getContentAsString());
        mvc.perform(post("/api/v1/auth/signup").session(session)
                        .header(json.<String>read("$.headerName"), json.<String>read("$.token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"place-user@example.com","password":"password123","nickname":"회원"}
                                """))
                .andExpect(status().isCreated());
        var member = login("place-user@example.com", "password123");
        mvc.perform(get("/api/v1/admin/dashboard").session(member.session()))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/places").session(member.session())
                        .header(member.header(), member.token()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"regionId":1,"name":"허용 안 됨","address":"주소",
                                 "latitude":37.5,"longitude":127.1}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("운영자는 공지 초안에 새 출처를 기록하고 수정한 내용을 장소별 목록에서 확인한다")
    void adminCreatesAndUpdatesNoticeDraft() throws Exception {
        var place = publishedPlace("공지 관리 장소");
        var otherPlace = publishedPlace("다른 장소");
        var existingSource = sourceFor(place);
        var admin = login("admin@example.com", "12341234");
        String path = noticePath(place.getId());

        var created = mvc.perform(post(path).session(admin.session()).header(admin.header(), admin.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"휴무 안내","content":"초안 내용","validFrom":"2026-11-23T09:00:00",
                                 "source":{"url":"https://example.com/holiday","verifiedAt":"2026-11-22T00:00:00"}}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.publishStatus").value("DRAFT"))
                .andExpect(jsonPath("$.source.url").value("https://example.com/holiday"))
                .andExpect(jsonPath("$.source.verifiedAt").value("2026-11-22T00:00:00"))
                .andReturn();
        var createdNotice = JsonPath.parse(created.getResponse().getContentAsString());
        Number noticeId = createdNotice.read("$.placeNoticeId");
        Number sourceId = createdNotice.read("$.source.sourceRecordId");

        entityManager.flush();
        entityManager.clear();
        var savedSource = sources.findById(sourceId.longValue()).orElseThrow();
        assertThat(savedSource.getPlace().getId()).isEqualTo(place.getId());
        assertThat(savedSource.getVerifierId()).isNotNull();
        mvc.perform(get("/api/v1/places/{id}", place.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notices").isEmpty())
                .andExpect(jsonPath("$.sources.length()").value(1))
                .andExpect(jsonPath("$.sources[0].sourceRecordId").value(existingSource.getId().intValue()));

        mvc.perform(patch(path + "/" + noticeId).session(admin.session()).header(admin.header(), admin.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(noticeBody("수정한 휴무 안내", existingSource.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("수정한 휴무 안내"))
                .andExpect(jsonPath("$.publishStatus").value("DRAFT"))
                .andExpect(jsonPath("$.validFrom").doesNotExist())
                .andExpect(jsonPath("$.source.sourceRecordId").value(existingSource.getId().intValue()));
        entityManager.flush();
        entityManager.clear();

        mvc.perform(get(path).session(admin.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].placeNoticeId").value(noticeId.intValue()))
                .andExpect(jsonPath("$.items[0].title").value("수정한 휴무 안내"))
                .andExpect(jsonPath("$.items[0].source.url").value("https://example.com/place"));
        mvc.perform(get(noticePath(otherPlace.getId())).session(admin.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    @DisplayName("운영자는 장소의 공지를 ID 내림차순으로 조회하고 페이지를 이동할 수 있다")
    void adminPaginatesNoticesInDescendingOrder() throws Exception {
        var place = publishedPlace("공지 목록 장소");
        var source = sourceFor(place);
        var first = saveNotice(place, source, "먼저 저장한 공지", PlacePublishStatus.DRAFT);
        var last = saveNotice(place, source, "나중에 저장한 공지", PlacePublishStatus.PUBLISHED);
        var admin = login("admin@example.com", "12341234");
        String path = noticePath(place.getId());

        mvc.perform(get(path).session(admin.session()).param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].placeNoticeId").value(last.getId().intValue()))
                .andExpect(jsonPath("$.items[0].publishStatus").value("PUBLISHED"))
                .andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get(path).session(admin.session()).param("page", "1").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].placeNoticeId").value(first.getId().intValue()));
        mvc.perform(get(path).session(admin.session()).param("size", "51"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("size"));
        mvc.perform(get(noticePath(Long.MAX_VALUE)).session(admin.session()))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("PLACE_NOT_FOUND"));
    }

    @Test
    @DisplayName("다른 장소의 출처를 등록·수정에 쓸 수 없고 다른 장소의 공지를 수정할 수 없다")
    void rejectsNoticeAndSourceFromOtherPlace() throws Exception {
        var place = publishedPlace("공지 대상 장소");
        var otherPlace = publishedPlace("출처가 속한 장소");
        var source = sourceFor(place);
        var otherSource = sourceFor(otherPlace);
        var draft = saveNotice(place, source, "원래 제목", PlacePublishStatus.DRAFT);
        var admin = login("admin@example.com", "12341234");
        String path = noticePath(place.getId());
        String body = noticeBody("변경할 제목", otherSource.getId());

        mvc.perform(post(path).session(admin.session()).header(admin.header(), admin.token())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PLACE_NOTICE_INVALID_SOURCE"));
        mvc.perform(patch(path + "/" + draft.getId()).session(admin.session()).header(admin.header(), admin.token())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PLACE_NOTICE_INVALID_SOURCE"));
        mvc.perform(patch(noticePath(otherPlace.getId()) + "/" + draft.getId())
                        .session(admin.session()).header(admin.header(), admin.token())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PLACE_NOTICE_NOT_FOUND"));
        mvc.perform(get(path).session(admin.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].title").value("원래 제목"));
    }

    @Test
    @DisplayName("초안 API는 이미 공개된 공지의 수정을 거절하고 유효기간 역전을 허용하지 않는다")
    void rejectsPublishedEditsAndInvalidValidityPeriod() throws Exception {
        var place = publishedPlace("초안 검사 장소");
        var source = sourceFor(place);
        var published = saveNotice(place, source, "공개 공지", PlacePublishStatus.PUBLISHED);
        var admin = login("admin@example.com", "12341234");
        String path = noticePath(place.getId());

        mvc.perform(patch(path + "/" + published.getId()).session(admin.session())
                        .header(admin.header(), admin.token()).contentType(MediaType.APPLICATION_JSON)
                        .content(noticeBody("수정 요청", source.getId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PLACE_NOTICE_NOT_DRAFT"));
        mvc.perform(post(path).session(admin.session()).header(admin.header(), admin.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"유효기간이 잘못된 공지","content":"본문","sourceRecordId":%d,
                                 "validFrom":"2026-11-24T00:00:00","validUntil":"2026-11-23T00:00:00"}
                                """.formatted(source.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("validityPeriodValid"));
    }

    @Test
    @DisplayName("초안 등록에는 기존 출처나 새 HTTP 출처 중 하나가 필요하다")
    void requiresExactlyOneValidSource() throws Exception {
        var place = publishedPlace("출처 입력 검사 장소");
        var source = sourceFor(place);
        var admin = login("admin@example.com", "12341234");
        String path = noticePath(place.getId());

        mvc.perform(post(path).session(admin.session()).header(admin.header(), admin.token())
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"title":"출처 없는 공지","content":"본문"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("sourceSelectionValid"));
        mvc.perform(post(path).session(admin.session()).header(admin.header(), admin.token())
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"title":"출처 중복 공지","content":"본문","sourceRecordId":%d,
                                 "source":{"url":"https://example.com/notice","verifiedAt":"2026-11-22T00:00:00"}}
                                """.formatted(source.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("sourceSelectionValid"));
        mvc.perform(post(path).session(admin.session()).header(admin.header(), admin.token())
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"title":"잘못된 출처 공지","content":"본문",
                                 "source":{"url":"file:///notice","verifiedAt":"2026-11-22T00:00:00"}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("source.url"));
    }

    @Test
    @DisplayName("일반 회원은 운영자 공지 목록 조회, 초안 등록과 수정을 할 수 없다")
    void memberCannotManageNotices() throws Exception {
        var place = publishedPlace("권한 검사 장소");
        var source = sourceFor(place);
        var draft = saveNotice(place, source, "운영자 공지", PlacePublishStatus.DRAFT);
        String path = noticePath(place.getId());
        String body = noticeBody("권한 없는 수정", source.getId());
        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        var session = (MockHttpSession) csrf.getRequest().getSession(false);
        var json = JsonPath.parse(csrf.getResponse().getContentAsString());
        mvc.perform(post("/api/v1/auth/signup").session(session)
                        .header(json.<String>read("$.headerName"), json.<String>read("$.token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"notice-user@example.com","password":"password123","nickname":"공지 회원"}
                                """))
                .andExpect(status().isCreated());
        var member = login("notice-user@example.com", "password123");

        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).session(member.session())).andExpect(status().isForbidden());
        mvc.perform(post(path).session(member.session()).header(member.header(), member.token())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(patch(path + "/" + draft.getId()).session(member.session()).header(member.header(), member.token())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
    }

    private Place publishedPlace(String name) {
        var region = regions.save(Region.builder().name("공지 테스트 지역").build());
        return places.saveAndFlush(Place.builder().region(region).name(name)
                .publishStatus(PlacePublishStatus.PUBLISHED).build());
    }

    private SourceRecord sourceFor(Place place) {
        return sources.saveAndFlush(SourceRecord.builder().place(place).type("OFFICIAL")
                .url("https://example.com/place").verifiedFields("address")
                .verifiedAt(LocalDateTime.of(2026, 11, 21, 0, 0)).build());
    }

    private PlaceNotice saveNotice(Place place, SourceRecord source, String title, PlacePublishStatus status) {
        return notices.saveAndFlush(PlaceNotice.builder().place(place).sourceRecord(source)
                .title(title).content("공지 본문").publishStatus(status).build());
    }

    private String noticePath(long placeId) {
        return "/api/v1/admin/places/" + placeId + "/notices";
    }

    private String noticeBody(String title, long sourceId) {
        return """
                {"title":"%s","content":"공지 본문","sourceRecordId":%d}
                """.formatted(title, sourceId);
    }

    private Login login(String email, String password) throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        var session = (MockHttpSession) csrf.getRequest().getSession(false);
        var json = JsonPath.parse(csrf.getResponse().getContentAsString());
        String header = json.read("$.headerName");
        String token = json.read("$.token");
        mvc.perform(post("/api/v1/auth/login").session(session).header(header, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk());
        return new Login(session, header, token);
    }

    private record Login(MockHttpSession session, String header, String token) {}
}
