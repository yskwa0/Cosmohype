import { notFound } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'

const VALID_SLUGS = ['supreme', 'comme-des-garcons', 'fashion-history', 'silhouette-basics', 'three-color-rule'] as const
type Slug = typeof VALID_SLUGS[number]

export default async function ColumnDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  if (!VALID_SLUGS.includes(slug as Slug)) {
    notFound()
  }

  return (
    <>
      <TopBar left={<BackButton />} title="コラム" />
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        {slug === 'supreme' && <SupremeArticle />}
        {slug === 'comme-des-garcons' && <CommeDesGarconsArticle />}
        {slug === 'fashion-history' && <FashionHistoryArticle />}
        {slug === 'silhouette-basics' && <SilhouetteBasicsArticle />}
        {slug === 'three-color-rule' && <ThreeColorRuleArticle />}
      </div>
    </>
  )
}

function SupremeArticle() {
  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}
        >
          ブランド
        </span>
        <h1 className="text-lg font-bold mt-3 leading-snug" style={{ color: 'var(--text)' }}>
          Supremeとは？ストリートから世界的ファッションブランドになった理由
        </h1>
      </div>

      <div className="h-px mb-7" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />

      {/* Article */}
      <article className="flex flex-col gap-5 text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>

        <p>Supremeは、1994年にニューヨーク・マンハッタンで始まったストリートブランドです。創業者はJames Jebbia。もともとはスケートカルチャーと深く結びついたショップとしてスタートし、今ではファッション、音楽、アート、カルチャーを横断する存在として知られています。</p>

        <p>Supremeの面白さは、単に「服を売るブランド」ではなく、街の空気や若者文化そのものをブランドにしてきたところにあります。スケーター、アーティスト、ミュージシャン、ファッション好きが交わる場所から生まれたブランドだからこそ、今でも独特の熱量を持っています。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          Supremeのルーツはニューヨークのスケートカルチャー
        </h2>

        <p>Supremeの最初の店舗は、ニューヨークのLafayette Streetにありました。店内はスケーターが入りやすいように作られていたとされ、服をただ並べるだけではなく、スケートコミュニティのたまり場のような役割も持っていました。</p>

        <p>ここがSupremeを理解するうえでかなり大事です。</p>

        <p>Supremeは最初から「高級ブランドになりたい」というより、ニューヨークのスケートシーンにいる人たちのリアルな感覚から始まっています。だから、Tシャツ、パーカー、キャップ、スケートデッキなど、日常で着られるアイテムが中心にあります。</p>

        <p>つまりSupremeの根っこには、スケート、ストリート、反骨感、仲間内の空気感みたいなものがあります。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          なぜここまで人気になったのか
        </h2>

        <p>Supremeが大きく広がった理由のひとつは、数を絞って販売するスタイルです。毎シーズン、新作アイテムが少しずつ発売され、人気アイテムはすぐに売り切れることもあります。この「欲しいけど簡単には手に入らない」という感覚が、ブランドの特別感を強めてきました。</p>

        <p>ただし、Supremeの魅力はレアだからだけではありません。</p>

        <p>本当に強いのは、スケートブランドでありながら、アート、音楽、映画、ハイファッションなど、さまざまなカルチャーとつながってきたことです。ストリートの荒さと、ファッションとしての洗練が同時にある。ここがSupremeらしさです。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          Supremeのデザインの特徴
        </h2>

        <p>Supremeのアイテムは、派手なものもあれば、かなりシンプルなものもあります。</p>

        <p>
          特に有名なのは、ブランド名を使ったボックスロゴですが、Cosmohypeでは画像やロゴを直接使うよりも、
          <strong style={{ color: 'var(--text)' }}>「シンプルなロゴ使い」「強い色のコントラスト」「ストリート感のあるグラフィック」</strong>
          といった言葉で説明するのが安全です。
        </p>

        <p>Supremeのデザインは、きれいにまとまりすぎていないところも魅力です。少し挑発的だったり、ユーモアがあったり、カルチャーを知っている人に刺さる文脈があったりします。</p>

        <p>だからSupremeは、ただの服というより、「わかる人にはわかる空気を着るブランド」とも言えます。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          コラボ文化を広げた存在
        </h2>

        <p>Supremeは、さまざまなブランドやアーティストとのコラボでも知られています。スポーツブランド、ファッションブランド、アーティスト、映画や音楽に関わる要素など、幅広いコラボによってストリートウェアの可能性を広げてきました。Vogueも、Supremeの成長においてコラボレーションや限定販売の仕組みが大きな役割を果たしたと紹介しています。</p>

        <p>このコラボ文化によって、Supremeはスケート好きだけでなく、ファッション好き、アート好き、音楽好きにも広がっていきました。</p>

        <p>今では「ストリートブランド」という枠を超えて、現代ファッションの中でも大きな影響力を持つブランドのひとつとして語られています。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          Supremeが似合うスタイル
        </h2>

        <p>Supremeは、アイテムの選び方によって雰囲気がかなり変わります。パーカーやキャップを主役にすれば王道のストリートスタイルに、シンプルなTシャツを使えばカジュアルな普段着にもなります。太めのパンツやスニーカーと合わせると、よりスケート・ストリート感が出ます。</p>

        <p>逆に、全身を強いロゴや派手なアイテムで固めると、少し主張が強くなりすぎることもあります。初心者なら、まずは1点だけ取り入れるのがおすすめです。無地コーデにSupremeのキャップ、シンプルなパンツにグラフィックTシャツ、パーカーを主役にして他のアイテムは落ち着かせる。こんな感じにすると、自然に着こなしやすいです。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          Supremeを一言でいうと？
        </h2>

        <p>Supremeは、ニューヨークのスケートカルチャーから始まり、ストリート、アート、音楽、ファッションを巻き込みながら大きくなったブランドです。</p>

        <p>人気の理由は、レアだからだけではありません。</p>

        <p>そこには、街のリアルな空気、カルチャーへの深い接続、そして「ただの服では終わらない」ブランドとしての存在感があります。</p>

        <p>Supremeを知ることは、ストリートファッションの歴史を少し知ることでもあります。</p>

        <p>ロゴだけを見るのではなく、その背景にあるスケートカルチャーやニューヨークの空気まで見ると、Supremeの面白さがもっとわかってきます。</p>

      </article>

      {/* Footer */}
      <div
        className="mt-8 pt-5 flex flex-col gap-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>参考・出典：</p>
          <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
            本記事は、Supreme公式情報、ファッションメディアの記事、公開されているブランド情報をもとに、Cosmohypeが独自に再構成したカルチャー解説です。
          </p>
          <ul className="flex flex-col gap-1">
            {[
              'Supreme 公式サイト',
              'Vogue「A Brief History of Supreme」',
              'Wikipedia「Supreme (brand)」',
            ].map((src) => (
              <li key={src} className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-muted)' }} />
                {src}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          ※本記事はファッション・カルチャー解説を目的としたものであり、Supremeおよび関連ブランドとの提携・協賛・監修を示すものではありません。
        </p>
      </div>
    </>
  )
}

function CommeDesGarconsArticle() {
  return (
    <>
      <div className="mb-6">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}
        >
          ブランド
        </span>
        <h1 className="text-lg font-bold mt-3 leading-snug" style={{ color: 'var(--text)' }}>
          コムデギャルソンの歴史
        </h1>
      </div>

      <div className="h-px mb-7" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />

      <article className="flex flex-col gap-5 text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>

        <p>コムデギャルソンは、日本を代表するファッションブランドのひとつです。ブランド名の「COMME des GARÇONS」は、フランス語で「少年のように」という意味を持ちます。</p>

        <p>創設者は、デザイナーの川久保玲。1969年にブランドをスタートし、1970年代には東京を中心に注目を集めるようになりました。</p>

        <p>当時のファッションは、女性らしいシルエットや華やかさ、美しく整った服が主流でした。しかしコムデギャルソンは、その流れとはまったく違う方向を向いていました。</p>

        <p>体のラインをきれいに見せる服ではなく、あえて形を崩す。鮮やかな色ではなく、黒を中心にする。完成された美しさではなく、ゆがみや余白、不完全さを表現する。</p>

        <p>その姿勢が、コムデギャルソンを特別な存在にしていきました。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          1981年、パリコレクションでの衝撃
        </h2>

        <p>コムデギャルソンが世界に大きな衝撃を与えたのは、1981年のパリコレクションです。</p>

        <p>黒を多く使った服、穴の開いたようなニット、ゆったりとしたシルエット、左右非対称のデザイン。それまでのヨーロッパのファッションとはまったく違う表現でした。</p>

        <p>当時は「ボロルック」などと呼ばれ、批判的に見られることもありました。しかし、その衝撃は同時に、ファッションの新しい可能性を世界に見せることにもなりました。</p>

        <p>服は、ただ人を美しく見せるためだけのものではない。服は、考え方や価値観、生き方まで表現できる。</p>

        <p>コムデギャルソンは、そんな新しいファッションの見方を提示したブランドでした。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          コムデギャルソンと「黒」
        </h2>

        <p>特にコムデギャルソンを象徴する色が「黒」です。</p>

        <p>黒は、それまで喪服や地味な色として見られることもありました。しかしコムデギャルソンは、黒を強さ、知性、静かな反抗心を感じさせる色として表現しました。</p>

        <p>ただ暗いだけではなく、黒の中にある深さや緊張感。シンプルなのに強い存在感。そのスタイルは、多くのファッション好きに影響を与えました。</p>

        <p>また、コムデギャルソンは「かわいい」「きれい」「流行っている」だけでは測れない服の面白さを教えてくれます。</p>

        <p>一見難しそうに見える服でも、そこにはデザイナーの考え方や、時代への問いかけが込められています。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          現在のコムデギャルソン
        </h2>

        <p>現在のコムデギャルソンは、世界中で高く評価されるブランドになっています。</p>

        <p>コレクションラインだけでなく、PLAY COMME des GARÇONSのように、ハートロゴで知られる親しみやすいラインもあります。そのため、モード好きからストリートファッション好きまで、幅広い人に支持されています。</p>

        <p>コムデギャルソンの面白さは、ただ有名だからではありません。常に「服とは何か」「美しさとは何か」を問い続けているところにあります。</p>

        <p>流行に合わせるだけではなく、自分たちの考えを服で表現する。その姿勢が、長い年月を経ても色あせない理由です。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          コムデギャルソンを知ると、ファッションの見方が変わる
        </h2>

        <p>コムデギャルソンを知ると、ファッションの見方が少し変わります。</p>

        <p>服は、似合うかどうかだけで選ぶものではありません。誰かに良く見られるためだけのものでもありません。</p>

        <p>自分の考え、自分の空気感、自分の違和感まで表現できるもの。コムデギャルソンは、そんなファッションの深さを教えてくれるブランドです。</p>

        <p>最初は難しく感じても大丈夫です。「なんでこの形なんだろう」「なんで黒ばかりなんだろう」「なんで普通じゃないのにかっこいいんだろう」</p>

        <p>そう思った瞬間から、コムデギャルソンの世界は少しずつ面白くなっていきます。</p>

        <p>ファッションを、ただ着るものから、考えて楽しむものへ。コムデギャルソンは、その扉を開いてくれるブランドです。</p>

      </article>

      {/* Footer */}
      <div
        className="mt-8 pt-5 flex flex-col gap-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>参考文献・参考資料：</p>
          <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
            本記事は、Comme des Garçons公式情報、ファッションメディアの記事、公開されているブランド情報をもとに、Cosmohypeが独自に再構成したカルチャー解説です。
          </p>
          <ul className="flex flex-col gap-1">
            {[
              'The Metropolitan Museum of Art「Rei Kawakubo/Comme des Garçons: Art of the In-Between」',
              'The Metropolitan Museum of Art「Comme des Garçons - Collection」',
              'Business of Fashion「Rei Kawakubo | BoF 500」',
              'COMME des GARÇONS 公式情報',
              'ファッション史に関する各種公開資料',
            ].map((src) => (
              <li key={src} className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-muted)' }} />
                {src}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          ※本記事はファッション・カルチャー解説を目的としたものであり、Comme des Garçonsおよび関連ブランドとの提携・協賛・監修を示すものではありません。
        </p>
      </div>
    </>
  )
}

function FashionHistoryArticle() {
  return (
    <>
      <div className="mb-6">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}
        >
          カルチャー
        </span>
        <h1 className="text-lg font-bold mt-3 leading-snug" style={{ color: 'var(--text)' }}>
          ファッションはどう変わってきた？時代で見るスタイルの移り変わり
        </h1>
      </div>

      <div className="h-px mb-7" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />

      <article className="flex flex-col gap-5 text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>

        <p>ファッションは、ただ服の形が変わってきた歴史ではありません。その時代の空気、価値観、音楽、働き方、若者文化まで映し出すものです。</p>

        <p>昔の服を見ると、その時代の人たちが何を大切にしていたのかが少し見えてきます。</p>

        <p>きちんと見えること。自由に動けること。自分らしさを表現すること。人と違うことを楽しむこと。</p>

        <p>時代が変わるたびに、ファッションの意味も少しずつ変わってきました。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          1900年代前半——きちんと見えることが大切だった時代
        </h2>

        <p>1900年代前半のファッションは、今よりも「きちんと見えること」が大切にされていました。</p>

        <p>男性はスーツや帽子、女性はドレスやスカートなど、社会的な立場や礼儀を表す服が中心でした。服は、自分らしさを自由に出すものというより、場に合わせて整えるものという意味が強かった時代です。</p>

        <p>しかし、時代が進むにつれて、人々の生活は大きく変わっていきます。働き方、女性の社会進出、戦争、経済成長。そうした変化によって、服にも動きやすさや実用性が求められるようになりました。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          1950〜60年代——若者がファッションを動かし始めた時代
        </h2>

        <p>1950年代から1960年代になると、若者文化がファッションに大きな影響を与え始めます。</p>

        <p>音楽、映画、雑誌、街のカルチャーが広がり、若者たちは大人と同じ服を着るだけではなく、自分たちのスタイルを作るようになりました。</p>

        <p>ミニスカート、デニム、レザー、カラフルな服。それまでの上品で整った服とは違い、自由で少し反抗的なスタイルが生まれていきます。</p>

        <p>ファッションは「きちんとするもの」から「自分の気分を表すもの」へと広がっていきました。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          1970〜80年代——個性とカルチャーが爆発した時代
        </h2>

        <p>1970年代から1980年代は、ファッションの個性がさらに強くなった時代です。</p>

        <p>ヒッピー、パンク、ディスコ、モード、ストリート。音楽やライフスタイルと結びついたスタイルが次々に登場しました。</p>

        <p>特にパンクファッションは、破れた服、安全ピン、派手な髪型などを使い、社会への反抗心を表現しました。一方で、1980年代にはブランドブームやパワースーツのように、強さや成功を見せるファッションも広がりました。</p>

        <p>この時代から、服は単なる流行ではなく、考え方や立場を表すものとしてより強く見られるようになります。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          1990〜2000年代——ストリートが主役になった時代
        </h2>

        <p>1990年代から2000年代にかけては、ストリートファッションが大きく広がりました。</p>

        <p>スケート、ヒップホップ、スポーツ、古着、スニーカー。高級ブランドだけではなく、街の若者たちの着こなしがファッションの中心に入ってきます。</p>

        <p>Tシャツ、パーカー、デニム、スニーカーのような日常的なアイテムも、組み合わせ方次第でスタイルとして評価されるようになりました。</p>

        <p>ファッションは、特別な場所のためだけのものではなく、毎日の生活の中で楽しむものになっていきます。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          現代——正解がない、自由な時代
        </h2>

        <p>そして現代のファッションは、ひとつの正解がない時代です。</p>

        <p>モード、ストリート、古着、韓国ファッション、Y2K、ミニマル、ジェンダーレス。さまざまなスタイルが同時に存在し、自分に合うものを自由に選べるようになりました。</p>

        <p>SNSの影響で、流行が生まれるスピードも速くなっています。昔は雑誌やブランドが流行を作ることが多かったですが、今は個人の投稿から新しいスタイルが広がることもあります。</p>

        <p>つまり今のファッションは、見る人だけでなく、着る人、投稿する人、発信する人が一緒に作っているものです。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          ファッションの歴史を知ると、もっと楽しくなる
        </h2>

        <p>ファッションの歴史を振り返ると、服はずっと変化し続けてきたことがわかります。</p>

        <p>きちんと見せるための服。自由を表す服。反抗心を表す服。日常を楽しむ服。自分らしさを伝える服。</p>

        <p>時代によって形は変わっても、ファッションはいつも人の気持ちや社会の空気とつながっています。</p>

        <p>だからこそ、今の自分がどんな服を選ぶのかにも意味があります。流行に乗るのもいい。あえて外すのもいい。好きな時代の雰囲気を取り入れるのも面白い。</p>

        <p>ファッションは、過去のスタイルを知るほどもっと楽しくなります。</p>

      </article>

      {/* Footer */}
      <div
        className="mt-8 pt-5 flex flex-col gap-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>参考文献・参考資料：</p>
          <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
            本記事は、ファッション史に関する公開情報・各種資料をもとに、Cosmohypeが独自に再構成したカルチャー解説です。
          </p>
          <ul className="flex flex-col gap-1">
            {[
              'The Metropolitan Museum of Art「Timeline of Art History」',
              'Victoria and Albert Museum「Fashion」',
              'Kyoto Costume Institute「Fashion History」',
              'Vogue Runway',
              'ファッション史に関する各種公開資料',
            ].map((src) => (
              <li key={src} className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-muted)' }} />
                {src}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          ※本記事はファッション・カルチャー解説を目的としたものであり、記載の各機関・メディアとの提携・協賛・監修を示すものではありません。
        </p>
      </div>
    </>
  )
}

function SilhouetteBasicsArticle() {
  return (
    <>
      <div className="mb-6">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}
        >
          基礎知識
        </span>
        <h1 className="text-lg font-bold mt-3 leading-snug" style={{ color: 'var(--text)' }}>
          服がおしゃれに見える理由は「シルエット」にある
        </h1>
      </div>

      <div className="h-px mb-7" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />

      <article className="flex flex-col gap-5 text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>

        <p>おしゃれに見える人と、なんとなく普通に見える人。その違いは、ブランドや値段だけで決まるわけではありません。</p>

        <p>実はかなり大事なのが「シルエット」です。</p>

        <p>シルエットとは、服を着たときの全体の形のこと。トップスとボトムスのバランス、服のゆるさ、体のラインの見え方によって、同じアイテムでも印象は大きく変わります。</p>

        <p>たとえば、白Tシャツと黒パンツだけのシンプルなコーデでも、サイズ感や形が整っているとおしゃれに見えます。逆に、高い服を着ていても、全体の形がちぐはぐだと、なんとなく決まらないことがあります。</p>

        <p>つまりシルエットは、コーデ全体の土台です。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          Iライン——すっきり縦長に見せるシルエット
        </h2>

        <p>まず覚えたいのが「Iライン」です。</p>

        <p>Iラインは、上から下までまっすぐ落ちるようなシルエットのこと。縦長に見えるので、すっきりした印象になります。</p>

        <p>細めのトップス、ストレートパンツ、ロングコート、落ち感のある服。こうしたアイテムを合わせると、Iラインが作りやすくなります。</p>

        <p>Iラインは、きれいめ、モード、大人っぽい雰囲気と相性がいいです。コーデをすっきり見せたいときや、シンプルにまとめたいときに使いやすいシルエットです。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          Aライン——安定感とリラックス感を出すシルエット
        </h2>

        <p>次に覚えたいのが「Aライン」です。</p>

        <p>Aラインは、上がコンパクトで、下に向かって広がるシルエットです。アルファベットのAのような形になるので、Aラインと呼ばれます。</p>

        <p>短めのトップス、ワイドパンツ、フレアスカート、ボリュームのあるボトムス。こうした組み合わせで作りやすいです。</p>

        <p>Aラインは、下半身に重さが出るので、安定感のあるコーデになります。ストリートっぽさや、リラックス感を出したいときにも使いやすい形です。</p>

        <p>トップスを少し短めにしたり、タックインしたりすると、バランスが取りやすくなります。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          Yライン——今っぽさを作るシルエット
        </h2>

        <p>もうひとつ大事なのが「Yライン」です。</p>

        <p>Yラインは、上にボリュームがあり、下がすっきりしているシルエットです。大きめのトップスやアウターに、細めのパンツを合わせると作りやすくなります。</p>

        <p>オーバーサイズのパーカー、ビッグシルエットのジャケット、ボリュームのあるニットに、細めのパンツやスキニー・テーパードパンツを合わせるのが定番の組み合わせです。</p>

        <p>Yラインは、上半身に存在感が出るので、今っぽい雰囲気を作りやすいです。特にオーバーサイズの服が好きな人には使いやすいバランスです。</p>

        <p>ただし、上下どちらも大きすぎると重たく見えることがあります。上を大きくしたら下は少しすっきりさせる。これだけで、コーデがかなり整って見えます。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          大切なのは「全部を盛らない」こと
        </h2>

        <p>シルエットを考えるときに大切なのは、「全部を盛らない」ことです。</p>

        <p>トップスも大きい、パンツも大きい、靴もボリュームがある、バッグも大きい。こうなると、全体が重たく見えることがあります。</p>

        <p>もちろん、あえて全体をルーズにするスタイルもあります。でも初心者の場合は、まずどこかにメリハリを作るのがおすすめです。</p>

        <p>上がゆるいなら、下はすっきり。下が太いなら、上はコンパクト。全体を細くするなら、縦のラインを意識する。</p>

        <p>この考え方だけでも、コーデの見え方はかなり変わります。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          シルエットは「自分をどう見せたいか」を決めるもの
        </h2>

        <p>シルエットは、体型を隠すためだけのものではありません。自分をどう見せたいかを決めるためのものです。</p>

        <p>すっきり見せたいならIライン。リラックス感や存在感を出したいならAライン。今っぽく、少しラフに見せたいならYライン。</p>

        <p>このように、シルエットを知っていると、服選びがかなり楽になります。</p>

        <p>「この服かわいいけど、何と合わせればいいかわからない」。そんなときも、シルエットで考えると答えが見つかりやすくなります。</p>

        <p>大事なのは、アイテム単体ではなく、全体の形を見ることです。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          おしゃれは、基本を知ることで上手くなる
        </h2>

        <p>おしゃれは、難しいルールを全部覚えなくても始められます。</p>

        <p>まずは鏡の前で、全身の形を見てみること。トップスとボトムスのバランスを見ること。ゆるい部分と、すっきりした部分を作ること。</p>

        <p>それだけで、いつもの服も少し違って見えるはずです。</p>

        <p>ファッションは、センスだけの世界ではありません。シルエットのような基本を知ることで、誰でも少しずつ上手くなれます。</p>

        <p>服選びに迷ったら、まずは色やブランドよりも「全体の形」を見てみる。それが、おしゃれに見える第一歩です。</p>

      </article>

      {/* Footer */}
      <div
        className="mt-8 pt-5 flex flex-col gap-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>参考文献・参考資料：</p>
          <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
            本記事は、ファッションの基礎知識に関する公開情報・各種資料をもとに、Cosmohypeが独自に再構成した解説です。
          </p>
          <ul className="flex flex-col gap-1">
            {[
              '文化服装学院 ファッション用語・服飾基礎に関する公開資料',
              'Vogue Japan ファッション用語解説',
              'The Business of Fashion ファッション基礎資料',
              'ファッションスタイリングに関する各種公開資料',
            ].map((src) => (
              <li key={src} className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-muted)' }} />
                {src}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          ※本記事はファッション・スタイリング解説を目的としたものであり、記載の各機関・メディアとの提携・協賛・監修を示すものではありません。
        </p>
      </div>
    </>
  )
}

function ThreeColorRuleArticle() {
  return (
    <>
      <div className="mb-6">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}
        >
          基礎知識
        </span>
        <h1 className="text-lg font-bold mt-3 leading-snug" style={{ color: 'var(--text)' }}>
          色合わせが苦手な人へ。まず覚えたい3色ルール
        </h1>
      </div>

      <div className="h-px mb-7" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />

      <article className="flex flex-col gap-5 text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>

        <p>「服の色合わせが難しい」。そう感じる人は多いです。</p>

        <p>同じアイテムでも、色の組み合わせによって印象は大きく変わります。なんとなくまとまって見える日もあれば、なぜかごちゃついて見える日もあります。</p>

        <p>その違いを作っているのが、色のバランスです。</p>

        <p>でも、最初から難しい配色理論を覚える必要はありません。まずは「3色までにまとめる」ことを意識するだけで、コーデはかなり整って見えます。</p>

        <p>この3色ルールは、ファッション初心者でも使いやすい基本の考え方です。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          ベースカラー——コーデの土台になる色
        </h2>

        <p>3色ルールとは、コーデに使う色を大きく3つに分けて考える方法です。</p>

        <p>1つ目は、ベースカラー。これはコーデの中で一番面積が大きい色です。</p>

        <p>黒、白、グレー、ネイビー、ベージュ、ブラウンなど、こうした色はベースカラーとして使いやすいです。</p>

        <p>パンツ、アウター、ワンピースなど、面積の大きいアイテムに使うと、コーデ全体が安定します。ベースカラーが落ち着いていると、他の色を足してもまとまりやすくなります。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          メインカラー——その日の雰囲気を作る色
        </h2>

        <p>2つ目は、メインカラーです。</p>

        <p>メインカラーは、その日のコーデの雰囲気を作る色です。トップス、シャツ、ニット、スカートなどに使うことが多いです。</p>

        <p>たとえば、黒のパンツをベースにした場合、白のシャツを合わせれば清潔感のある印象になります。ブルーのニットを合わせれば爽やかに、赤のトップスを合わせれば強く目を引く印象になります。</p>

        <p>メインカラーは、自分がその日どんな雰囲気に見せたいかを決める色です。落ち着いて見せたいなら、白、グレー、ネイビー、ブラウン。明るく見せたいなら、ブルー、グリーン、ピンク、イエロー。</p>

        <p>色を1つ決めるだけで、コーデの方向性がかなり見えやすくなります。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          アクセントカラー——コーデに引っかかりを作る色
        </h2>

        <p>3つ目は、アクセントカラーです。</p>

        <p>アクセントカラーは、コーデの中で少しだけ使う色です。バッグ、靴、帽子、アクセサリー、靴下、インナーなどに入れると使いやすいです。</p>

        <p>たとえば、全体を黒と白でまとめたコーデに、赤いバッグを持つ。ネイビーとグレーの落ち着いたコーデに、シルバーのアクセサリーを入れる。ベージュ系のコーデに、グリーンの小物を合わせる。こうすると、コーデにちょっとした引っかかりが生まれます。</p>

        <p>アクセントカラーは、たくさん使いすぎるとごちゃついて見えることがあります。最初は小物で少しだけ入れるのがおすすめです。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          まずは「黒・白・グレー」を味方にする
        </h2>

        <p>色合わせが苦手な人は、まず「黒・白・グレー」を味方にすると楽です。</p>

        <p>この3色は、ほとんどの色と合わせやすい基本カラーです。迷ったときは、黒パンツに白トップス、グレーのアウターのように、モノトーンでまとめるだけでも十分おしゃれに見えます。</p>

        <p>そこに1色だけ、自分の好きな色を足してみる。これだけで、失敗しにくいコーデになります。</p>

        <p>黒×白×ブルー、グレー×白×ピンク、黒×ベージュ×グリーン、ネイビー×白×シルバー。ベーシックな色を土台にして、好きな色を少し足すとまとまりやすくなります。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          色の数だけでなく「色の強さ」も意識する
        </h2>

        <p>色合わせでは、色の数だけでなく「色の強さ」も大切です。</p>

        <p>鮮やかな赤、明るい黄色、強いピンクのような色は、少し入れるだけでもかなり目立ちます。逆に、ベージュ、ブラウン、グレー、くすみブルーのような色は、やわらかくなじみやすいです。</p>

        <p>強い色を使うときは、他の色を落ち着かせる。落ち着いた色が多いときは、小物で少し明るさを足す。このバランスを意識すると、コーデが整いやすくなります。</p>

        <p>色は、足せば足すほどおしゃれになるわけではありません。むしろ、どの色を主役にするかを決めることが大切です。</p>

        <h2 className="text-base font-semibold pt-1" style={{ color: 'var(--text)' }}>
          色合わせは、役割を知ることで楽になる
        </h2>

        <p>ファッションの色合わせに、絶対の正解はありません。でも、最初のうちはルールがあると選びやすくなります。</p>

        <p>まずは3色までにまとめる。ベースカラーで安定させる。メインカラーで雰囲気を作る。アクセントカラーで少しだけ遊ぶ。この流れを覚えるだけで、朝の服選びはかなり楽になります。</p>

        <p>色合わせがうまい人は、たくさんの色を使っている人ではありません。色の役割をわかっていて、必要な分だけ使える人です。</p>

        <p>迷ったら、まずは全身を見てみてください。「今日の主役の色はどれ？」。そう考えるだけで、コーデはぐっとまとまりやすくなります。</p>

      </article>

      {/* Footer */}
      <div
        className="mt-8 pt-5 flex flex-col gap-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>参考文献・参考資料：</p>
          <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
            本記事は、ファッションの色合わせに関する公開情報・各種資料をもとに、Cosmohypeが独自に再構成した解説です。
          </p>
          <ul className="flex flex-col gap-1">
            {[
              '文化服装学院 ファッション用語・服飾基礎に関する公開資料',
              'Vogue Japan ファッション用語解説',
              '色彩検定協会 色彩に関する基礎資料',
              'ファッションスタイリングに関する各種公開資料',
            ].map((src) => (
              <li key={src} className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-muted)' }} />
                {src}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          ※本記事はファッション・スタイリング解説を目的としたものであり、記載の各機関・メディアとの提携・協賛・監修を示すものではありません。
        </p>
      </div>
    </>
  )
}
