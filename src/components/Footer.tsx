import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Car } from "lucide-react";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer ref={ref} className="py-10 px-4 border-t border-border bg-card">
      <div className="container max-w-5xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">카테인</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              자동차 구매와 유지비에 관한<br />
              신뢰할 수 있는 정보 플랫폼
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">서비스</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/magazine" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  매거진
                </Link>
              </li>
              <li>
                <Link 
                  to="/calculator" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  유지비 계산기
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">회사</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/about" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  회사 소개
                </Link>
              </li>
              <li>
                <Link 
                  to="/contact" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  문의하기
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">법적 고지</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/privacy" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  이용약관
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground text-center md:text-left">
              <p>© {currentYear} 카테인. All rights reserved.</p>
              <p className="mt-1">
                사업자: 카테인 | 이메일: contact@cartain.kr
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link 
                to="/privacy" 
                className="hover:text-primary transition-colors"
              >
                개인정보처리방침
              </Link>
              <span className="text-border">|</span>
              <Link 
                to="/terms" 
                className="hover:text-primary transition-colors"
              >
                이용약관
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
