import io
import unittest

from logo import show_logo


class EncodingLimitedStream(io.StringIO):
    encoding = "cp1252"

    def write(self, text):
        text.encode(self.encoding)
        return super().write(text)


class LogoTests(unittest.TestCase):
    def test_show_logo_falls_back_when_stream_cannot_encode_unicode(self):
        stream = EncodingLimitedStream()

        show_logo(stream=stream)

        output = stream.getvalue()

        self.assertIn("____", output)
        self.assertNotIn("\u2588", output)


if __name__ == "__main__":
    unittest.main()
