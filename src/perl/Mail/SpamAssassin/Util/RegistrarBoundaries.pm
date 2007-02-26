# The (extremely complex) rules for domain delegation.

# <@LICENSE>
# Copyright 2004 Apache Software Foundation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# </@LICENSE>

package Mail::SpamAssassin::Util::RegistrarBoundaries;

use strict;
use warnings;
use bytes;

use vars qw (
  @ISA %TWO_LEVEL_DOMAINS %US_STATES %VALID_TLDS
);

# The list of currently-valid TLDs for the DNS system.
#
# http://www.iana.org/cctld/cctld-whois.htm
# "su" Extra from http://www.iana.org/root-whois/
# http://www.iana.org/gtld/gtld.htm
# http://www.iana.org/arpa-dom/
# "eu" just in case, for the future
foreach (qw/
  ac ad ae af ag ai al am an ao aq ar as at au aw az ax ba bb bd be bf bg bh bi
  bj bm bn bo br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cs cu
  cv cx cy cz de dj dk dm do dz ec ee eg eh er es et fi fj fk fm fo fr ga gb gd
  ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im
  in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk
  lr ls lt lu lv ly ma mc md mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my
  mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt
  pw py qa re ro ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr st sv sy sz
  tc td tf tg th tj tk tl tm tn to tp tr tt tv tw tz ua ug uk um us uy uz va vc
  ve vg vi vn vu wf ws ye yt yu za zm zw
  su
  aero biz com coop info museum name net org pro gov edu mil int
  arpa
  eu
  jobs travel
  xxx
  /) {
  $VALID_TLDS{$_} = 1;
}

# http://www.neustar.us/policies/docs/rfc_1480.txt
# data from http://spamcheck.freeapp.net/two-level-tlds , in turn from
# http://www.bestregistrar.com/help/ccTLD.htm
# http://www.hkdnr.net.hk/instructions/new_domain.html
foreach(qw/
  fed.us dni.us
  com.ac edu.ac gov.ac mil.ac net.ac org.ac
  ac.ae co.ae com.ae gov.ae net.ae org.ae pro.ae sch.ae
  com.ai edu.ai gov.ai org.ai
  com.ar edu.ar gov.ar int.ar mil.ar net.ar org.ar uba.ar
  e164.arpa
  ac.at co.at gv.at or.at priv.at
  asn.au com.au conf.au csiro.au edu.au gov.au id.au info.au net.au org.au otc.au oz.au telememo.au
  com.az net.az org.az
  com.bb net.bb org.bb
  ac.be belgie.be dns.be fgov.be
  com.bh edu.bh gov.bh net.bh org.bh
  com.bm edu.bm gov.bm net.bm org.bm
  art.br com.br etc.br g12.br gov.br ind.br inf.br mil.br net.br org.br psi.br rec.br sp.br tmp.br
  com.bs net.bs org.bs
  ab.ca bc.ca mb.ca nb.ca nf.ca nl.ca ns.ca nt.ca nu.ca on.ca pe.ca qc.ca sk.ca yk.ca
  co.ck edu.ck gov.ck net.ck org.ck
  ac.cn ah.cn bj.cn com.cn cq.cn edu.cn gd.cn gov.cn gs.cn gx.cn gz.cn hb.cn he.cn hi.cn hk.cn hl.cn hn.cn jl.cn js.cn ln.cn mo.cn net.cn nm.cn nx.cn org.cn qh.cn sc.cn sh.cn sn.cn sx.cn tj.cn tw.cn xj.cn xz.cn yn.cn zj.cn
  arts.co com.co edu.co firm.co gov.co info.co int.co mil.co nom.co org.co rec.co store.co web.co
  lkd.co.im plc.co.im
  au.com br.com cn.com de.com eu.com gb.com hu.com no.com qc.com ru.com sa.com se.com uk.com us.com uy.com za.com
  ac.cr co.cr ed.cr fi.cr go.cr or.cr sa.cr
  com.cu net.cu org.cu
  ac.cy com.cy gov.cy net.cy org.cy
  co.dk
  art.do com.do edu.do gov.do mil.do net.do org.do web.do
  art.dz ass.dz com.dz edu.dz gov.dz net.dz org.dz pol.dz
  com.ec edu.ec fin.ec gov.ec k12.ec med.ec mil.ec net.ec org.ec
  com.eg edu.eg eun.eg gov.eg net.eg org.eg sci.eg
  biz.et com.et edu.et gov.et info.et name.et net.et org.et
  ac.fj com.fj gov.fj id.fj org.fj school.fj
  ac.fk com.fk gov.fk net.fk nom.fk org.fk
  aeroport.fr assedic.fr asso.fr avocat.fr avoues.fr barreau.fr cci.fr chambagri.fr chirurgiens-dentistes.fr com.fr experts-comptables.fr geometre-expert.fr gouv.fr greta.fr huissier-justice.fr medecin.fr nom.fr notaires.fr pharmacien.fr port.fr prd.fr presse.fr tm.fr veterinaire.fr
  com.ge edu.ge gov.ge mil.ge net.ge org.ge pvt.ge
  ac.gg alderney.gg co.gg gov.gg guernsey.gg ind.gg ltd.gg net.gg org.gg sark.gg sch.gg
  com.gu edu.gu gov.gu mil.gu net.gu org.gu
  com.hk edu.hk gov.hk idv.hk net.hk org.hk
  2000.hu agrar.hu bolt.hu casino.hu city.hu co.hu erotica.hu erotika.hu film.hu forum.hu games.hu hotel.hu info.hu ingatlan.hu jogasz.hu konyvelo.hu lakas.hu media.hu news.hu org.hu priv.hu reklam.hu sex.hu shop.hu sport.hu suli.hu szex.hu tm.hu tozsde.hu utazas.hu video.hu
  ac.id co.id go.id mil.id net.id or.id
  ac.il co.il gov.il idf.il k12.il muni.il net.il org.il
  ac.im co.im gov.im net.im nic.im org.im
  ac.in co.in ernet.in firm.in gen.in gov.in ind.in mil.in net.in nic.in org.in res.in
  ac.je co.je gov.je ind.je jersey.je ltd.je net.je org.je sch.je
  com.jo edu.jo gov.jo mil.jo net.jo org.jo
  ac.jp ad.jp aichi.jp akita.jp aomori.jp chiba.jp co.jp ed.jp ehime.jp fukui.jp fukuoka.jp fukushima.jp gifu.jp go.jp gov.jp gr.jp gunma.jp hiroshima.jp hokkaido.jp hyogo.jp ibaraki.jp ishikawa.jp iwate.jp kagawa.jp kagoshima.jp kanagawa.jp kanazawa.jp kawasaki.jp kitakyushu.jp kobe.jp kochi.jp kumamoto.jp kyoto.jp lg.jp matsuyama.jp mie.jp miyagi.jp miyazaki.jp nagano.jp nagasaki.jp nagoya.jp nara.jp ne.jp net.jp niigata.jp oita.jp okayama.jp okinawa.jp org.jp or.jp osaka.jp saga.jp saitama.jp sapporo.jp sendai.jp shiga.jp shimane.jp shizuoka.jp takamatsu.jp tochigi.jp tokushima.jp tokyo.jp tottori.jp toyama.jp utsunomiya.jp wakayama.jp yamagata.jp yamaguchi.jp yamanashi.jp yokohama.jp
  com.kh edu.kh gov.kh mil.kh net.kh org.kh per.kh
  ac.kr co.kr go.kr kyonggi.kr ne.kr or.kr pe.kr re.kr seoul.kr
  com.kw edu.kw gov.kw net.kw org.kw
  com.la net.la org.la
  com.lb edu.lb gov.lb mil.lb net.lb org.lb
  com.lc edu.lc gov.lc net.lc org.lc
  asn.lv com.lv conf.lv edu.lv gov.lv id.lv mil.lv net.lv org.lv
  com.ly net.ly org.ly
  ac.ma co.ma net.ma org.ma press.ma
  com.mk
  com.mm edu.mm gov.mm net.mm org.mm
  com.mo edu.mo gov.mo net.mo org.mo
  com.mt edu.mt net.mt org.mt tm.mt uu.mt
  com.mx net.mx org.mx
  com.my edu.my gov.my net.my org.my
  alt.na com.na cul.na edu.na net.na org.na telecom.na unam.na
  com.nc net.nc org.nc
  de.net gb.net uk.net
  ac.ng com.ng edu.ng gov.ng net.ng org.ng sch.ng
  com.ni edu.ni gob.ni net.ni nom.ni org.ni
  tel.no
  com.np edu.np gov.np net.np org.np
  fax.nr mobile.nr mobil.nr mob.nr tel.nr tlf.nr
  ac.nz co.nz cri.nz geek.nz gen.nz govt.nz iwi.nz maori.nz mil.nz net.nz org.nz school.nz
  ac.om biz.om com.om co.om edu.om gov.om med.om mod.om museum.om net.om org.om pro.om
  dk.org eu.org
  ac.pa com.pa edu.pa gob.pa net.pa org.pa sld.pa
  com.pe edu.pe gob.pe mil.pe net.pe nom.pe org.pe
  ac.pg com.pg net.pg
  com.ph mil.ph net.ph ngo.ph org.ph
  biz.pk com.pk edu.pk fam.pk gob.pk gok.pk gon.pk gop.pk gos.pk gov.pk net.pk org.pk web.pk
  agro.pl aid.pl atm.pl auto.pl biz.pl com.pl edu.pl gmina.pl gsm.pl info.pl mail.pl media.pl miasta.pl mil.pl net.pl nieruchomosci.pl nom.pl org.pl pc.pl powiat.pl priv.pl realestate.pl rel.pl sex.pl shop.pl sklep.pl sos.pl szkola.pl targi.pl tm.pl tourism.pl travel.pl turystyka.pl
  edu.ps gov.ps plo.ps sec.ps
  com.py edu.py net.py org.py
  com.qa edu.qa gov.qa net.qa org.qa
  asso.re com.re nom.re
  com.ru net.ru org.ru pp.ru
  com.sa edu.sa gov.sa med.sa net.sa org.sa pub.sa sch.sa
  com.sb edu.sb gov.sb net.sb org.sb
  com.sd edu.sd gov.sd med.sd net.sd org.sd sch.sd
  com.sg edu.sg gov.sg net.sg org.sg per.sg
  com.sh edu.sh gov.sh mil.sh net.sh org.sh
  com.sv edu.sv gob.sv org.sv red.sv
  com.sy gov.sy net.sy org.sy
  ac.th co.th go.th net.th or.th
  com.tn edunet.tn ens.tn fin.tn gov.tn ind.tn info.tn intl.tn nat.tn net.tn org.tn rnrt.tn rns.tn rnu.tn tourism.tn
  bbs.tr com.tr edu.tr gen.tr gov.tr k12.tr mil.tr net.tr org.tr
  at.tt au.tt be.tt biz.tt ca.tt com.tt co.tt de.tt dk.tt edu.tt es.tt eu.tt fr.tt gov.tt info.tt it.tt name.tt net.tt nic.tt org.tt pro.tt se.tt uk.tt us.tt
  co.tv
  com.tw edu.tw gove.tw idv.tw net.tw org.tw
  com.ua edu.ua gov.ua net.ua org.ua
  ac.ug co.ug go.ug or.ug
  ac.uk co.uk edu.uk gov.uk ltd.uk me.uk mod.uk net.uk nhs.uk nic.uk org.uk plc.uk police.uk sch.uk
  com.uy edu.uy gub.uy mil.uy net.uy org.uy
  arts.ve bib.ve com.ve co.ve edu.ve firm.ve gov.ve info.ve int.ve mil.ve net.ve nom.ve org.ve rec.ve store.ve tec.ve web.ve
  co.vi net.vi org.vi
  ac.vn biz.vn com.vn edu.vn gov.vn health.vn info.vn int.vn name.vn net.vn org.vn pro.vn ch.vu com.vu de.vu edu.vu fr.vu net.vu org.vu
  com.ws edu.ws gov.ws net.ws org.ws
  com.ye edu.ye gov.ye mil.ye net.ye org.ye
  ac.yu co.yu edu.yu org.yu
  ac.za alt.za bourse.za city.za co.za edu.za gov.za law.za mil.za net.za ngo.za nom.za org.za school.za tm.za web.za
  ac.zw co.zw gov.zw org.zw
 /) {
  $TWO_LEVEL_DOMAINS{$_} = 1;
}

# This is required because the .us domain is nuts. See $THREE_LEVEL_DOMAINS
# and $FOUR_LEVEL_DOMAINS below.
#
foreach (qw/
  ak al ar az ca co ct dc de fl ga gu hi ia id il in ks ky la ma md me mi
  mn mo ms mt nc nd ne nh nj nm nv ny oh ok or pa pr ri sc sd tn tx ut va vi
  vt wa wi wv wy
  /) {
  $US_STATES{$_} = 1;
}

###########################################################################

=item ($hostname, $domain) = split_domain ($fqdn)

Cut a fully-qualified hostname into the hostname part and the domain
part, splitting at the DNS registrar boundary.

Examples:

    "www.foo.com" => ( "www", "foo.com" )
    "www.foo.co.uk" => ( "www", "foo.co.uk" )

=cut

sub split_domain {
  my $domain = lc shift;
  my $hostname = '';

  if ($domain) {
    # www..spamassassin.org -> www.spamassassin.org
    $domain =~ tr/././s;

    # leading/trailing dots
    $domain =~ s/^\.+//;
    $domain =~ s/\.+$//;

    # Split scalar domain into components
    my @domparts = split(/\./, $domain);
    my @hostname = ();

    while (@domparts > 1) { # go until we find the TLD
      if (@domparts == 4) {
	if ($domparts[3] eq 'us' &&
	    (($domparts[0] eq 'pvt' && $domparts[1] eq 'k12') ||
	     ($domparts[0] =~ /^c[io]$/)))
	{
          # http://www.neustar.us/policies/docs/rfc_1480.txt
          # "Fire-Dept.CI.Los-Angeles.CA.US"
          # "<school-name>.PVT.K12.<state>.US"
          last if ($US_STATES{$domparts[2]});
	}
      }
      elsif (@domparts == 3) {
        # http://www.neustar.us/policies/docs/rfc_1480.txt
	# demon.co.uk
	# esc.edu.ar
	# [^\.]+\.${US_STATES}\.us
	if ($domparts[2] eq 'uk' || $domparts[2] eq 'ar') {
	  my $temp = join('.', @domparts);
	  last if ($temp eq 'demon.co.uk' || $temp eq 'esc.edu.ar');
	}
	elsif ($domparts[2] eq 'us') {
          last if ($US_STATES{$domparts[1]});
	}
      }
      elsif (@domparts == 2) {
	# co.uk, etc.
	my $temp = join(".", @domparts);
        last if ($TWO_LEVEL_DOMAINS{$temp});
      }
      push(@hostname, shift @domparts);
    }

    # Look for a sub-delegated TLD
    # use @domparts to skip trying to match on TLDs that can't possibly
    # match, but keep in mind that the hostname can be blank, so 4TLD needs 4,
    # 3TLD needs 3, 2TLD needs 2 ...
    #
    unshift @domparts, pop @hostname if @hostname;
    $domain = join(".", @domparts);
    $hostname = join(".", @hostname);
  }

  ($hostname, $domain);
}

###########################################################################

=item $domain = trim_domain($fqdn)

Cut a fully-qualified hostname into the hostname part and the domain
part, returning just the domain.

Examples:

    "www.foo.com" => "foo.com"
    "www.foo.co.uk" => "foo.co.uk"

=cut

sub trim_domain {
  my ($domain) = @_;
  my ($host, $dom) = split_domain($domain);
  return $dom;
}

###########################################################################

=item $ok = is_domain_valid($dom)

Return C<1> if the domain is valid, C<undef> otherwise.  A valid domain
(a) does not contain whitespace, (b) contains at least one dot, and (c)
uses a valid TLD or ccTLD.

=cut

sub is_domain_valid {
  my ($dom) = @_;

  # domains don't have whitespace
  return 0 if ($dom =~ /\s/);

  # ensure it ends in a known-valid TLD, and has at least 1 dot
  return 0 unless ($dom =~ /\.([^.]+)$/);
  return 0 unless ($VALID_TLDS{$1});

  return 1;     # nah, it's ok.
}

1;
