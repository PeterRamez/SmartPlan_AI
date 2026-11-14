import {it,expect} from "vitest";
import {detectLanguage} from "../src/lib/language";
it("detects Arabic script",()=>expect(detectLanguage("هل يحق للشركة فصلي؟")).toBe("ar"));
it("detects German",()=>expect(detectLanguage("Was sagt das Gesetz?")).toBe("de"));
