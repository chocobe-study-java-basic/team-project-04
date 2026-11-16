package com.outpick.domain.place.importer;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TourApiHttpTransportTests {
    @Test @SuppressWarnings("unchecked")
    void encodesDecodingKeyOnceAndUsesFixedOfficialHost() throws Exception {
        var client = mock(HttpClient.class);
        HttpResponse<byte[]> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("응답".getBytes(StandardCharsets.UTF_8));
        when(client.send(any(), any(HttpResponse.BodyHandler.class))).thenReturn(response);
        assertThat(new TourApiHttpTransport("a+b/c==", client).fetchCommon("123")).isEqualTo("응답");
        var request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(client).send(request.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(request.getValue().uri().getHost()).isEqualTo("apis.data.go.kr");
        assertThat(request.getValue().uri().getRawQuery()).contains("serviceKey=a%2Bb%2Fc%3D%3D", "contentId=123");
        assertThat(request.getValue().timeout()).isPresent();
    }

    @Test void sanitizesTransportExceptionsAndRejectsInvalidIdBeforeRequest() throws Exception {
        var client = mock(HttpClient.class);
        when(client.send(any(), any())).thenThrow(new IOException("https://example.com?serviceKey=secret"));
        var transport = new TourApiHttpTransport("secret", client);
        assertThatThrownBy(() -> transport.fetchCommon("123")).isInstanceOf(TourApiException.class)
                .hasNoCause().hasMessageNotContaining("secret");
        clearInvocations(client);
        assertThatThrownBy(() -> transport.fetchCommon("../../123")).isInstanceOf(TourApiException.class);
        verifyNoInteractions(client);
    }

    @Test void preservesInterruptFlag() throws Exception {
        var client = mock(HttpClient.class);
        when(client.send(any(), any())).thenThrow(new InterruptedException("secret"));
        try {
            assertThatThrownBy(() -> new TourApiHttpTransport("secret", client).fetchCommon("1"))
                    .isInstanceOf(TourApiException.class).hasNoCause();
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally { Thread.interrupted(); }
    }
}
