package de.haw.usenext.api;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * The generated interfaces map paths without prefix (the spec's server URL is /api). The prefix is added here so that
 * the root of the application stays free for the static files of the use-web production build.
 */
@Configuration
class WebConfig implements WebMvcConfigurer {

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix("/api", HandlerTypePredicate.forBasePackage("de.haw.usenext.api"));
    }
}
