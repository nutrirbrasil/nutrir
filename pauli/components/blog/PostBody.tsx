type Props = {
  html: string;
};

export function PostBody({ html }: Props) {
  return (
    <div
      className="blog-prose dark-accent-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
