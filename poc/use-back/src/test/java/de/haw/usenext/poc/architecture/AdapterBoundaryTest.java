package de.haw.usenext.poc.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/** BR-02: org.tzi.use.* may only be imported inside the adapter package. */
@AnalyzeClasses(packages = "de.haw.usenext.poc", importOptions = ImportOption.DoNotIncludeTests.class)
class AdapterBoundaryTest {

    @ArchTest
    static final ArchRule useCoreOnlyInsideAdapter = noClasses()
            .that().resideOutsideOfPackage("..adapter..")
            .should().dependOnClassesThat().resideInAPackage("org.tzi.use..");
}
