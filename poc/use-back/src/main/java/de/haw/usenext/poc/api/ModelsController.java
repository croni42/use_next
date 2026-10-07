package de.haw.usenext.poc.api;

import de.haw.usenext.poc.adapter.UseCoreAdapter;
import de.haw.usenext.poc.api.model.ModelsHealth;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ModelsController implements ModelsApi {

    private static final String MODEL = "model Health\nclass Person\nattributes\n  name : String\nend\n";
    private static final String EXPRESSION = "Set{1, 2, 3}->collect(i | i * i)->sum()";

    private final UseCoreAdapter useCore;

    public ModelsController(UseCoreAdapter useCore) {
        this.useCore = useCore;
    }

    @Override
    public ResponseEntity<ModelsHealth> getModelsHealth() {
        return ResponseEntity.ok(new ModelsHealth("ok", useCore.evaluate(MODEL, EXPRESSION)));
    }
}
