package de.haw.usenext.service;

import java.util.regex.Pattern;

/**
 * Turns text produced by a library into a short plain-text message that is safe to return to the client.
 * Anything that looks like a stack trace, a file path or a class name is replaced by the fallback.
 */
final class MessageSanitizer {

    static final int MAX_LENGTH = 500;

    private static final Pattern CONTROL = Pattern.compile("[\\p{Cntrl}\\p{Cf}]+");
    private static final Pattern INTERNALS = Pattern.compile(
            "\\bat [\\w$.]+\\(|\\b(?:org|java|javax|jakarta|de|com|sun|jdk)\\.[a-z]\\w*\\.[\\w.$]+"
                    + "|[A-Za-z]:\\\\|(?:^|\\s)/(?:home|usr|var|tmp|opt|etc|Users)/|\\.(?:java|use|soil):\\d+"
                    + "|Exception\\b");

    private MessageSanitizer() {
    }

    static String sanitize(String raw, String fallback) {
        if (raw == null) {
            return fallback;
        }
        String text = CONTROL.matcher(raw).replaceAll(" ").strip();
        if (text.isEmpty() || INTERNALS.matcher(text).find()) {
            return fallback;
        }
        return text.length() > MAX_LENGTH ? text.substring(0, MAX_LENGTH - 1) + "…" : text;
    }
}
