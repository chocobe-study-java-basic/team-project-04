package com.outpick.domain.favorite;

import com.jayway.jsonpath.JsonPath;
import com.outpick.domain.place.entity.Place;
import com.outpick.domain.place.entity.PlacePublishStatus;
import com.outpick.domain.place.entity.Region;
import com.outpick.domain.place.repository.PlaceRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@AutoConfigureMockMvc
@Testcontainers
class FavoriteApiTests {
    private static final String FAVORITES = "/api/v1/members/me/favorites";

    @Container
    @ServiceConnection
    static MySQLContainer mysql = new MySQLContainer("mysql:8.4.13");

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlaceRepository places;
    @Autowired EntityManager entityManager;
    @Autowired TransactionTemplate transactions;

    @Test
    @DisplayName("관심 장소는 중복 저장되지 않고 회원별로 조회·해제된다")
    void storesOneFavoritePerMemberAndRemovesOnlyTheCurrentMembersFavorite() throws Exception {
        var first = login("first-favorite@example.com");
        var second = login("second-favorite@example.com");
        long placeId = createPlace();

        mvc.perform(first.withCsrf(put(FAVORITES + "/{placeId}", placeId)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.placeId").value(placeId))
                .andExpect(jsonPath("$.message").value("관심 장소에 저장했습니다."));
        var saved = jdbc.queryForMap("SELECT favorite_id, created_at FROM favorite WHERE place_id = ?", placeId);
        mvc.perform(first.withCsrf(put(FAVORITES + "/{placeId}", placeId)))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("FAVORITE_ALREADY_EXISTS"))
                .andExpect(jsonPath("$.detail").value("이미 관심 장소에 저장된 장소입니다."));
        assertThat(jdbc.queryForMap("SELECT favorite_id, created_at FROM favorite WHERE place_id = ?", placeId))
                .isEqualTo(saved);
        mvc.perform(get(FAVORITES).session(first.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(placeId));
        mvc.perform(get(FAVORITES).session(second.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());

        mvc.perform(second.withCsrf(put(FAVORITES + "/{placeId}", placeId))).andExpect(status().isOk());
        mvc.perform(first.withCsrf(delete(FAVORITES + "/{placeId}", placeId)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.placeId").value(placeId))
                .andExpect(jsonPath("$.message").value("관심 장소에서 해제했습니다."));
        mvc.perform(first.withCsrf(delete(FAVORITES + "/{placeId}", placeId))).andExpect(status().isOk());
        mvc.perform(get(FAVORITES).session(first.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mvc.perform(get(FAVORITES).session(second.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(placeId));
        mvc.perform(first.withCsrf(put(FAVORITES + "/{placeId}", placeId))).andExpect(status().isOk());
    }

    @Test
    @DisplayName("관심 장소는 로그인과 CSRF를 검증하고 공개 장소는 비회원도 조회한다")
    void requiresSessionAndCsrfAndKeepsPublicPlaceAccess() throws Exception {
        var member = login("protected-favorite@example.com");
        long placeId = createPlace();

        mvc.perform(get(FAVORITES)).andExpect(status().isUnauthorized());
        mvc.perform(put(FAVORITES + "/{placeId}", placeId).session(member.session()))
                .andExpect(status().isForbidden());
        mvc.perform(member.withCsrf(put(FAVORITES + "/{placeId}", placeId))).andExpect(status().isOk());
        mvc.perform(delete(FAVORITES + "/{placeId}", placeId).session(member.session()))
                .andExpect(status().isForbidden());
        mvc.perform(get(FAVORITES).session(member.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(placeId));
        mvc.perform(get("/api/v1/places/{placeId}", placeId)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("비공개 장소의 관심 기록은 보존하고 목록에서 숨기며 해제를 허용한다")
    void preservesTheFavoriteWhenAPlaceIsHiddenAndAllowsItsRemoval() throws Exception {
        var member = login("hidden-favorite@example.com");
        long placeId = createPlace();
        mvc.perform(member.withCsrf(put(FAVORITES + "/{placeId}", placeId))).andExpect(status().isOk());

        var place = places.findById(placeId).orElseThrow();
        place.changePublishStatus(PlacePublishStatus.HIDDEN);
        places.save(place);
        mvc.perform(member.withCsrf(put(FAVORITES + "/{placeId}", placeId)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("PLACE_NOT_FOUND"));
        mvc.perform(member.withCsrf(put(FAVORITES + "/{placeId}", Long.MAX_VALUE)))
                .andExpect(status().isNotFound());
        mvc.perform(get(FAVORITES).session(member.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        assertThat(favoriteCount(placeId)).isEqualTo(1);

        mvc.perform(member.withCsrf(delete(FAVORITES + "/{placeId}", placeId))).andExpect(status().isOk());
        assertThat(favoriteCount(placeId)).isZero();
    }

    @Test
    @DisplayName("동시에 같은 관심 장소를 저장하면 한 건은 성공하고 한 건은 중복 오류를 반환한다")
    void concurrentSavesReturnOneSuccessAndOneConflict() throws Exception {
        var member = login("concurrent-favorite@example.com");
        long placeId = createPlace();
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> saveTogether(member, placeId, ready, start));
            var second = executor.submit(() -> saveTogether(member, placeId, ready, start));
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(java.util.List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
        }
        assertThat(favoriteCount(placeId)).isEqualTo(1);
    }

    private int saveTogether(MemberSession member, long placeId, CountDownLatch ready, CountDownLatch start)
            throws Exception {
        ready.countDown();
        assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
        return mvc.perform(member.withCsrf(put(FAVORITES + "/{placeId}", placeId)))
                .andReturn().getResponse().getStatus();
    }

    private long createPlace() {
        return transactions.execute(transaction -> {
            var region = Region.builder().name("관심 장소 테스트 지역").build();
            entityManager.persist(region);
            var place = Place.builder().region(region).name("관심 장소")
                    .publishStatus(PlacePublishStatus.PUBLISHED).build();
            entityManager.persist(place);
            return place.getId();
        });
    }

    private int favoriteCount(long placeId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM favorite WHERE place_id = ?", Integer.class, placeId);
    }

    private MemberSession login(String email) throws Exception {
        var result = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        var session = (MockHttpSession) result.getRequest().getSession(false);
        String csrfResponse = result.getResponse().getContentAsString();
        var member = new MemberSession(session, JsonPath.read(csrfResponse, "$.headerName"),
                JsonPath.read(csrfResponse, "$.token"));
        mvc.perform(member.withCsrf(post("/api/v1/auth/signup")).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123","nickname":"관심 장소 회원"}
                                """.formatted(email)))
                .andExpect(status().isCreated());
        mvc.perform(member.withCsrf(post("/api/v1/auth/login")).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123"}
                                """.formatted(email)))
                .andExpect(status().isOk());
        return member;
    }

    private record MemberSession(MockHttpSession session, String headerName, String token) {
        MockHttpServletRequestBuilder withCsrf(MockHttpServletRequestBuilder request) {
            return request.session(session).header(headerName, token);
        }
    }
}
