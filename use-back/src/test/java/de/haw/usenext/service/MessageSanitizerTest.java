package de.haw.usenext.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class MessageSanitizerTest {

    private static final String FALLBACK = "fallback";

    @Test
    void keepsPlainCompilerMessages() {
        assertEquals("expression:1:8: no viable alternative at input '<EOF>'",
                MessageSanitizer.sanitize("expression:1:8: no viable alternative at input '<EOF>'", FALLBACK));
    }

    @Test
    void replacesControlCharacters() {
        assertEquals("a b c", MessageSanitizer.sanitize("a\r\nb\u0000\tc", FALLBACK));
    }

    @Test
    void truncatesLongMessages() {
        String result = MessageSanitizer.sanitize("x".repeat(2000), FALLBACK);
        assertEquals(MessageSanitizer.MAX_LENGTH, result.length());
    }

    @Test
    void replacesAnythingThatLooksLikeInternals() {
        String[] internals = {
            "java.lang.NullPointerException: boom",
            "\tat org.tzi.use.parser.Foo.bar(Foo.java:12)",
            "failed in org.tzi.use.uml.mm.MModel",
            "C:\\Users\\x\\model.use",
            "cannot read /home/app/models/company.use",
            "models/company.use:3:4 broken",
            "",
        };
        for (String text : internals) {
            assertEquals(FALLBACK, MessageSanitizer.sanitize(text, FALLBACK), text);
        }
        assertEquals(FALLBACK, MessageSanitizer.sanitize(null, FALLBACK));
        assertTrue(MessageSanitizer.sanitize("ok", FALLBACK).equals("ok"));
    }
}
