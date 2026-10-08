package de.haw.usenext.adapter;

import java.io.PrintWriter;
import java.io.StringWriter;
import org.springframework.stereotype.Component;
import org.tzi.use.parser.ocl.OCLCompiler;
import org.tzi.use.parser.use.USECompiler;
import org.tzi.use.uml.mm.MModel;
import org.tzi.use.uml.mm.ModelFactory;
import org.tzi.use.uml.ocl.expr.Evaluator;
import org.tzi.use.uml.ocl.expr.Expression;
import org.tzi.use.uml.ocl.value.Value;
import org.tzi.use.uml.sys.MSystem;

@Component
public class DefaultUseCoreAdapter implements UseCoreAdapter {

    @Override
    public String evaluate(String modelSource, String oclExpression) {
        StringWriter errors = new StringWriter();
        PrintWriter err = new PrintWriter(errors);

        MModel model = USECompiler.compileSpecification(modelSource, "model.use", err, new ModelFactory());
        if (model == null) {
            throw new UseCoreException("Model does not compile: " + errors);
        }
        MSystem system = new MSystem(model);
        Expression expr = OCLCompiler.compileExpression(
                model, system.state(), oclExpression, "expression", err, system.varBindings());
        if (expr == null) {
            throw new UseCoreException("Expression does not compile: " + errors);
        }
        Value value = new Evaluator().eval(expr, system.state());
        return value.toString();
    }
}
