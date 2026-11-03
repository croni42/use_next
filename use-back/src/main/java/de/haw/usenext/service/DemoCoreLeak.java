package de.haw.usenext.service;

// DEMO-SEED adapter-boundary
final class DemoCoreLeak {

    static final Class<?> LEAKED_TYPE = org.tzi.use.uml.sys.MSystem.class;

    private DemoCoreLeak() {}
}
