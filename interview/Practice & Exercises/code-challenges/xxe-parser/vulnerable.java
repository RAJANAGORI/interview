import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import java.io.ByteArrayInputStream;

public class XxeVuln {
    public Document parse(byte[] xml) throws Exception {
        DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
        // BUG: external entities enabled by default on many parsers
        return dbf.newDocumentBuilder()
            .parse(new ByteArrayInputStream(xml));
    }
}
