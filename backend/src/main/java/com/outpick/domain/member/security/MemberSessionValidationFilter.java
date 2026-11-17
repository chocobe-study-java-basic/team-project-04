package com.outpick.domain.member.security;

import com.outpick.domain.member.repository.MemberRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class MemberSessionValidationFilter extends OncePerRequestFilter {
    private final MemberRepository members;

    public MemberSessionValidationFilter(MemberRepository members) {
        this.members = members;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof MemberSessionPrincipal principal
                && !members.existsByIdAndAuthVersionAndStatus(principal.memberId(), principal.authVersion(), "ACTIVE")) {
            var session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            SecurityContextHolder.clearContext();
        }
        chain.doFilter(request, response);
    }
}
