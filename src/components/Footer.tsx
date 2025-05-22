
const Footer = () => {
  return (
    <footer className="border-t py-6 mt-auto">
      <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
        <div className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} TextCorrect. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
