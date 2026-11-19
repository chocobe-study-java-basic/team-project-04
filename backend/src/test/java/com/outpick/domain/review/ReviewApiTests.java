package com.outpick.domain.review;

import com.jayway.jsonpath.JsonPath;
import com.outpick.domain.place.entity.Place;
import com.outpick.domain.place.entity.PlacePublishStatus;
import com.outpick.domain.place.entity.Region;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@AutoConfigureMockMvc
@Testcontainers
class ReviewApiTests {
    @Container @ServiceConnection
    static MySQLContainer mysql = new MySQLContainer("mysql:8.4.13");

    @Autowired MockMvc mvc;
    @Autowired EntityManager entityManager;
    @Autowired TransactionTemplate transactions;

    @Test
    @DisplayName("후기는 장소별로 조회하고 작성자만 수정·삭제할 수 있다")
    void reviewsStayWithTheirPlaceAndOnlyAuthorCanEdit() throws Exception {
        var author = login("review-author@example.com");
        var other = login("review-other@example.com");
        long firstPlace = createPlace(PlacePublishStatus.PUBLISHED);
        long secondPlace = createPlace(PlacePublishStatus.PUBLISHED);

        var created = mvc.perform(author.withCsrf(post("/api/v1/places/{placeId}/reviews", firstPlace)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"첫 장소 후기\"}")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.placeId").value(firstPlace))
                .andExpect(jsonPath("$.body").value("첫 장소 후기")).andReturn();
        int reviewId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/v1/places/{placeId}/reviews", firstPlace))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(reviewId));
        mvc.perform(get("/api/v1/places/{placeId}/reviews", secondPlace))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mvc.perform(other.withCsrf(put("/api/v1/reviews/{id}", reviewId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"남의 수정\"}")))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("REVIEW_FORBIDDEN"));
        mvc.perform(other.withCsrf(delete("/api/v1/reviews/{id}", reviewId)))
                .andExpect(status().isForbidden());
        mvc.perform(author.withCsrf(put("/api/v1/reviews/{id}", reviewId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"수정 후기\"}")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.body").value("수정 후기"));
        mvc.perform(author.withCsrf(delete("/api/v1/reviews/{id}", reviewId)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/places/{placeId}/reviews", firstPlace))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @DisplayName("작성은 로그인·CSRF·본문 검증을 거치며 비공개 장소에는 등록할 수 없다")
    void createRequiresSessionCsrfValidBodyAndPublishedPlace() throws Exception {
        var member = login("review-guard@example.com");
        long published = createPlace(PlacePublishStatus.PUBLISHED);
        long hidden = createPlace(PlacePublishStatus.HIDDEN);
        var guestCsrf = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        var guestSession = (MockHttpSession) guestCsrf.getRequest().getSession(false);
        String guestToken = guestCsrf.getResponse().getContentAsString();
        mvc.perform(post("/api/v1/places/{placeId}/reviews", published).session(guestSession)
                        .header(JsonPath.read(guestToken, "$.headerName"),
                                (String) JsonPath.read(guestToken, "$.token"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"후기\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/places/{placeId}/reviews", published).session(member.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"후기\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(member.withCsrf(post("/api/v1/places/{placeId}/reviews", published)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"   \"}")))
                .andExpect(status().isBadRequest());
        mvc.perform(member.withCsrf(post("/api/v1/places/{placeId}/reviews", hidden)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"후기\"}")))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/places/{placeId}/reviews", hidden)).andExpect(status().isNotFound());
    }

    private long createPlace(PlacePublishStatus status) {
        return transactions.execute(transaction -> {
            var region = Region.builder().name("후기 테스트 지역").build();
            entityManager.persist(region);
            var place = Place.builder().region(region).name("후기 테스트 장소").publishStatus(status).build();
            entityManager.persist(place);
            return place.getId();
        });
    }

    private MemberSession login(String email) throws Exception {
        var result = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        var session = (MockHttpSession) result.getRequest().getSession(false);
        String csrf = result.getResponse().getContentAsString();
        var member = new MemberSession(session, JsonPath.read(csrf, "$.headerName"), JsonPath.read(csrf, "$.token"));
        mvc.perform(member.withCsrf(post("/api/v1/auth/signup")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"password123\",\"nickname\":\"후기 회원\"}"))
                .andExpect(status().isCreated());
        mvc.perform(member.withCsrf(post("/api/v1/auth/login")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk());
        return member;
    }

    private record MemberSession(MockHttpSession session, String header, String csrf) {
        MockHttpServletRequestBuilder withCsrf(MockHttpServletRequestBuilder request) {
            return request.session(session).header(header, csrf);
        }
    }
}
